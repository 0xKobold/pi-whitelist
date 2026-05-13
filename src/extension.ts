/**
 * pi-whitelist — Tool Permission Extension for pi-coding-agent
 *
 * Gates all tool calls through the tri-state permission system (allow/deny/ask).
 * Reads rules from .pi/settings.json (project) and ~/.pi/agent/settings.json (global).
 * Prompts user for "ask" decisions in interactive mode, blocks in non-interactive.
 * Registers /whitelist command for managing rules.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	PermissionManager,
	parseRuleString,
	serializeRuleString,
} from "./index.js";
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

/** Normalize tool names to PascalCase as used in rules */
function normalizeToolName(name: string): string {
	return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Extract ruleContent from a tool call event input */
function extractRuleContent(toolName: string, input: Record<string, unknown>): string | undefined {
	switch (toolName) {
		case "Bash":
			return (input.command as string) ?? undefined;
		case "Edit":
		case "Write":
			return (input.path as string) ?? (input.file_path as string) ?? undefined;
		case "Read":
			return (input.path as string) ?? (input.file_path as string) ?? undefined;
		default:
			return undefined;
	}
}

/** Read permission settings from a JSON file */
function readPermissionRules(filePath: string): { allow: string[]; deny: string[]; ask: string[] } | null {
	if (!existsSync(filePath)) return null;
	try {
		const raw = JSON.parse(readFileSync(filePath, "utf-8"));
		return raw?.permissions ?? null;
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
		settings.permissions = { allow: [], deny: [], ask: [], additionalDirectories: [] };
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
	const globalRules = readPermissionRules(globalSettingsPath);
	if (globalRules) {
		for (const rule of globalRules.allow ?? []) manager.addRule(parseRuleString(rule), "allow", "userSettings");
		for (const rule of globalRules.deny ?? []) manager.addRule(parseRuleString(rule), "deny", "userSettings");
		for (const rule of globalRules.ask ?? []) manager.addRule(parseRuleString(rule), "ask", "userSettings");
	}

	const projectRules = readPermissionRules(projectSettingsPath);
	if (projectRules) {
		for (const rule of projectRules.allow ?? []) manager.addRule(parseRuleString(rule), "allow", "projectSettings");
		for (const rule of projectRules.deny ?? []) manager.addRule(parseRuleString(rule), "deny", "projectSettings");
		for (const rule of projectRules.ask ?? []) manager.addRule(parseRuleString(rule), "ask", "projectSettings");
	}

	log.info(`Ready — mode: ${mode}`);

	// ──── Tool Call Gate ────
	pi.on("tool_call", async (event: any, ctx: ExtensionContext) => {
		const toolName = normalizeToolName(event.toolName);
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

		// behavior === "ask"
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
						`📋 Whitelist Rules: (none)\n\nMode: ${mode}\n\nUse /whitelist allow <Tool> [pattern] to add rules.\nUse /whitelist deny <Tool> [pattern] to deny tools.`,
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
				const ruleValue = parseRuleString(toolStr);
				manager.addRule(ruleValue, behavior, "session");
				ctx.ui.notify(`✅ Added ${behavior} rule: ${toolStr} (session)`, "info");
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
				`Usage:\n  /whitelist status              — Show current rules\n  /whitelist allow <Tool> [pattern] — Allow a tool\n  /whitelist deny <Tool> [pattern]  — Deny a tool\n  /whitelist mode <mode>           — Set permission mode`,
				"info",
			);
		},
	});

	log.info("Extension loaded — /whitelist command registered");
}