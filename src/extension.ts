/**
 * pi-whitelist — Tool Permission Extension for pi-coding-agent
 *
 * Gates all tool calls through the tri-state permission system (allow/deny/ask).
 * Reads rules from .pi/settings.json (project) and ~/.pi/agent/settings.json (global).
 * Supports denyPaths — gitignore-style path globs that auto-expand to deny rules.
 * Prompts user for "ask" decisions in interactive mode, blocks in non-interactive.
 * Registers /whitelist command for managing rules.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	PermissionManager,
	parseRuleString,
	serializeRuleString,
} from "./index.js";
import {
	expandDenyPaths,
	FILE_TOOLS,
} from "./deny-paths.js";
import type { PermissionBehavior, PermissionRuleValue, PermissionMode } from "./types/index.js";

import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";

const log = {
	info: (msg: string, ...args: unknown[]) => console.log(`[pi-whitelist] ${msg}`, ...args),
	warn: (msg: string, ...args: unknown[]) => console.warn(`[pi-whitelist] ${msg}`, ...args),
};

/** Generate a glob pattern from a concrete value for "always allow" rules */
function generatePattern(content: string): string {
	if (/[*.?{}[\]]/.test(content)) return content;
	if (content.includes(" ")) return `${content.split(" ")[0]} *`;
	if (content.startsWith("/")) return `${content}/**`;
	return content;
}

/** Extract ruleContent from a tool call event input */
function extractRuleContent(toolName: string, input: Record<string, unknown>): string | undefined {
	switch (toolName.toLowerCase()) {
		case "bash":
			return (input.command as string) ?? undefined;
		case "edit":
		case "write":
			return (input.path as string) ?? (input.file_path as string) ?? undefined;
		case "read":
			return (input.path as string) ?? (input.file_path as string) ?? undefined;
		default:
			return undefined;
	}
}

/** Tools that operate on file paths — denyPaths expands into deny rules for these */

/** Read permission settings from a JSON file */
function readPermissionSettings(filePath: string): {
	allow: string[]
	deny: string[]
	ask: string[]
	denyPaths: string[]
} | null {
	if (!existsSync(filePath)) return null;
	try {
		const raw = JSON.parse(readFileSync(filePath, "utf-8"));
		const perms = raw?.permissions;
		if (!perms) return null;
		return {
			allow: perms.allow ?? [],
			deny: perms.deny ?? [],
			ask: perms.ask ?? [],
			denyPaths: perms.denyPaths ?? [],
		};
	} catch {
		return null;
	}
}

/** Append a rule to a settings JSON file */
function persistRule(filePath: string, rule: PermissionRuleValue, behavior: PermissionBehavior): void {
	const dir = filePath.substring(0, filePath.lastIndexOf("/"));
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	let settings: any = {};
	if (existsSync(filePath)) {
		try {
			settings = JSON.parse(readFileSync(filePath, "utf-8"));
		} catch {
			settings = {};
		}
	}

	if (!settings.permissions) {
		settings.permissions = { allow: [], deny: [], ask: [], denyPaths: [], additionalDirectories: [] };
	}

	const serialized = serializeRuleString(rule);
	const list: string[] = settings.permissions[behavior] ?? [];
	if (!list.includes(serialized)) {
		list.push(serialized);
		settings.permissions[behavior] = list;
	}

	writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
}

export default async function whitelistExtension(pi: ExtensionAPI): Promise<void> {
	log.info("Loading pi-whitelist extension...");

	const globalSettingsPath = join(homedir(), ".pi", "agent", "settings.json");
	const projectSettingsPath = join(process.cwd(), ".pi", "settings.json");

	// Determine mode from flags
	let mode: PermissionMode = "default";
	const bypassFlag = pi.getFlag("dangerously-skip-permissions");
	if (bypassFlag === true) {
		mode = "bypassPermissions";
	}

	const manager = new PermissionManager({
		mode,
		isBypassPermissionsModeAvailable: true,
	});

	// Load persisted rules from settings files
	const globalSettings = readPermissionSettings(globalSettingsPath);
	if (globalSettings) {
		for (const rule of globalSettings.allow) manager.addRule(parseRuleString(rule), "allow", "userSettings");
		for (const rule of globalSettings.deny) manager.addRule(parseRuleString(rule), "deny", "userSettings");
		for (const rule of globalSettings.ask) manager.addRule(parseRuleString(rule), "ask", "userSettings");
		// Expand denyPaths into deny rules
		for (const rule of expandDenyPaths(globalSettings.denyPaths)) manager.addRule(parseRuleString(rule), "deny", "userSettings");
	}

	const projectSettings = readPermissionSettings(projectSettingsPath);
	if (projectSettings) {
		for (const rule of projectSettings.allow) manager.addRule(parseRuleString(rule), "allow", "projectSettings");
		for (const rule of projectSettings.deny) manager.addRule(parseRuleString(rule), "deny", "projectSettings");
		for (const rule of projectSettings.ask) manager.addRule(parseRuleString(rule), "ask", "projectSettings");
		for (const rule of expandDenyPaths(projectSettings.denyPaths)) manager.addRule(parseRuleString(rule), "deny", "projectSettings");
	}

	const totalGlobal = globalSettings ? (globalSettings.allow.length + globalSettings.deny.length + globalSettings.ask.length + globalSettings.denyPaths.length) : 0;
	const totalProject = projectSettings ? (projectSettings.allow.length + projectSettings.deny.length + projectSettings.ask.length + projectSettings.denyPaths.length) : 0;
	log.info(`Ready — mode: ${mode}, global rules: ${totalGlobal}, project rules: ${totalProject}`);

	// ──── Tool Call Gate ────
	pi.on("tool_call", async (event: any, ctx: ExtensionContext) => {
		const toolName = event.toolName as string;
		const ruleContent = extractRuleContent(toolName, event.input as Record<string, unknown>);

		const decision = manager.check({ toolName, ruleContent });

		if (decision.behavior === "allow") {
			return undefined;
		}

		if (decision.behavior === "deny") {
			log.warn(`Denied: ${toolName}${ruleContent ? `(${ruleContent})` : ""}`);
			return {
				block: true,
				reason: decision.message ?? `Denied by whitelist: ${toolName}`,
			};
		}

		// behavior === "ask" — prompt user
		if (!ctx.hasUI) {
			return {
				block: true,
				reason: `Whitelist gate: no UI to confirm ${toolName}${ruleContent ? ` (${ruleContent})` : ""}`,
			};
		}

		const label = ruleContent ? `${toolName}: ${ruleContent}` : toolName;
		const choice = await ctx.ui.select(
			`🔐 Permission required:\n\n  ${label}\n\nAllow this invocation?`,
			["Allow once", "Allow always", "Deny"],
		);

		if (choice === "Allow once") {
			return undefined;
		}

		if (choice === "Allow always") {
			const pattern = ruleContent ? generatePattern(ruleContent) : undefined;
			manager.addRule({ toolName, ruleContent: pattern }, "allow", "projectSettings");
			try {
				persistRule(projectSettingsPath, { toolName, ruleContent: pattern }, "allow");
			} catch (err) {
				log.warn(`Failed to persist rule: ${err}`);
			}
			return undefined;
		}

		// Deny
		return { block: true, reason: `Blocked by user: ${label}` };
	});

	// ──── /whitelist Command ────
	pi.registerCommand("whitelist", {
		description: "Manage tool permission whitelist rules",
		handler: async (args: string | undefined, ctx: ExtensionContext) => {
			const parts = (args ?? "").trim().split(/\s+/);
			const subcommand = parts[0] || "status";

			if (subcommand === "status") {
				const allRules = [
					...manager.getRulesFromSource("userSettings"),
					...manager.getRulesFromSource("projectSettings"),
					...manager.getRulesFromSource("session"),
				];

				if (allRules.length === 0) {
					ctx.ui.notify(
						`📋 Whitelist Rules: (none)\n\nMode: ${mode}\n\nUse /whitelist allow <Tool> [pattern] to add rules.\nUse /whitelist deny <Tool> [pattern] to deny tools.\nUse /whitelist deny-path <glob> to deny file paths.`,
						"info",
					);
				} else {
					const lines = allRules.map(
						(r) => `  ${r.ruleBehavior}: ${r.ruleValue.toolName}${r.ruleValue.ruleContent ? `(${r.ruleValue.ruleContent})` : ""} [${r.source}]`,
					);
					ctx.ui.notify(`📋 Whitelist Rules (${allRules.length}):\n${lines.join("\n")}\n\nMode: ${mode}`, "info");
				}
				return;
			}

			if (subcommand === "allow" || subcommand === "deny") {
				const behavior = subcommand as PermissionBehavior;
				const toolStr = parts[1];
				if (!toolStr) {
					ctx.ui.notify(`Usage: /whitelist ${subcommand} <ToolName> [pattern]\nExample: /whitelist allow Bash "git *"`, "info");
					return;
				}
				manager.addRule(parseRuleString(toolStr), behavior, "session");
				ctx.ui.notify(`✅ Added ${behavior} rule: ${toolStr} (session)`, "info");
				return;
			}

			if (subcommand === "deny-path") {
				const pathPattern = parts[1];
				if (!pathPattern) {
					ctx.ui.notify(`Usage: /whitelist deny-path <glob>\nExample: /whitelist deny-path ".env*"\nDenies Read/Edit/Write for matching file paths.`, "info");
					return;
				}
				for (const tool of FILE_TOOLS) {
					manager.addRule({ toolName: tool, ruleContent: pathPattern }, "deny", "session");
				}
				ctx.ui.notify(`⛔ Denied path: ${pathPattern} (applies to Read/Edit/Write, session-only)`, "info");
				return;
			}

			if (subcommand === "mode") {
				const newMode = parts[1];
				if (!newMode || !["default", "bypassPermissions", "plan", "acceptEdits", "dontAsk"].includes(newMode)) {
					ctx.ui.notify(
						`Current mode: ${mode}\n\nAvailable: default, bypassPermissions, plan, acceptEdits, dontAsk\nUsage: /whitelist mode <mode>`,
						"info",
					);
					return;
				}
				manager.setMode(newMode as PermissionMode);
				ctx.ui.notify(`🔄 Permission mode set to: ${newMode}`, "info");
				return;
			}

			ctx.ui.notify(
				`Usage:\n  /whitelist status                — Show current rules\n  /whitelist allow <Tool> [pattern] — Allow a tool\n  /whitelist deny <Tool> [pattern]   — Deny a tool\n  /whitelist deny-path <glob>       — Deny Read/Edit/Write for path pattern\n  /whitelist mode <mode>            — Set permission mode`,
				"info",
			);
		},
	});

	log.info("Extension loaded — /whitelist command registered, tool_call gate active");
}