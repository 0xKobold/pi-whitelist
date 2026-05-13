/**
 * pi-whitelist — Tool Permission Extension for pi-coding-agent
 *
 * Gates all tool calls through the tri-state permission system (allow/deny/ask).
 * Reads rules from .pi/settings.json, .pi/settings.local.json, and ~/.pi/agent/settings.json.
 * Supports denyPaths, smart pattern suggestions, progressive learning, and dangerous overrides.
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
import { suggestBashPatterns, suggestFilePatterns, generateSmartDefault } from "./smart-patterns.js";
import { createPrefixTracker, recordAllowOnce } from "./progressive-learning.js";
import { checkDangerousOverride } from "./dangerous-override.js";
import type { PermissionBehavior, PermissionRuleValue, PermissionMode } from "./types/index.js";

import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";

const log = {
	info: (msg: string, ...args: unknown[]) => console.log(`[pi-whitelist] ${msg}`, ...args),
	warn: (msg: string, ...args: unknown[]) => console.warn(`[pi-whitelist] ${msg}`, ...args),
};

/** Check if a select choice matches a numbered option by its prefix */
function isChoice(choice: string | undefined, num: number): boolean {
	if (!choice) return false;
	return choice.startsWith(`${num} `) || choice.startsWith(`${num}.`);
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

/** Load rules from a settings file into the manager */
function loadSettingsIntoManager(
	filePath: string,
	manager: PermissionManager,
	source: "userSettings" | "projectSettings" | "localSettings",
): { totalRules: number; totalDenyPaths: number } | null {
	const settings = readPermissionSettings(filePath);
	if (!settings) return null;

	for (const rule of settings.allow) manager.addRule(parseRuleString(rule), "allow", source);
	for (const rule of settings.deny) manager.addRule(parseRuleString(rule), "deny", source);
	for (const rule of settings.ask) manager.addRule(parseRuleString(rule), "ask", source);
	for (const rule of expandDenyPaths(settings.denyPaths)) manager.addRule(parseRuleString(rule), "deny", source);

	return {
		totalRules: settings.allow.length + settings.deny.length + settings.ask.length,
		totalDenyPaths: settings.denyPaths.length,
	};
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
	const localSettingsPath = join(process.cwd(), ".pi", "settings.local.json");

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

	// Progressive learning tracker
	const tracker = createPrefixTracker(3);

	// Load rules from settings files (lowest to highest priority)
	const globalStats = loadSettingsIntoManager(globalSettingsPath, manager, "userSettings");
	const projectStats = loadSettingsIntoManager(projectSettingsPath, manager, "projectSettings");
	const localStats = loadSettingsIntoManager(localSettingsPath, manager, "localSettings");

	log.info(`Ready — mode: ${mode}, global: ${globalStats ? `${globalStats.totalRules}r + ${globalStats.totalDenyPaths}p` : 'none'}, project: ${projectStats ? `${projectStats.totalRules}r + ${projectStats.totalDenyPaths}p` : 'none'}, local: ${localStats ? `${localStats.totalRules}r + ${localStats.totalDenyPaths}p` : 'none'}`);

	// ──── Tool Call Gate ────
	pi.on("tool_call", async (event: any, ctx: ExtensionContext) => {
		const toolName = event.toolName as string;
		const ruleContent = extractRuleContent(toolName, event.input as Record<string, unknown>);

		// Step 1: Dangerous override — always re-prompt for dangerous commands
		const dangerousOverride = checkDangerousOverride(toolName, ruleContent);
		if (dangerousOverride) {
			if (!ctx.hasUI) {
				return { block: true, reason: dangerousOverride.message };
			}
			const label = ruleContent ? `${toolName}: ${ruleContent}` : toolName;
			const choice = await ctx.ui.select(
				`⚠️  ${label}\n\nDangerous command. Allow anyway?`,
				["1 Allow once", "2 Allow always", "3 Deny"],
			);

			if (isChoice(choice, 2)) {
				const pattern = generateSmartDefault(toolName, ruleContent);
				manager.addRule({ toolName, ruleContent: pattern }, "allow", "localSettings");
				try { persistRule(localSettingsPath, { toolName, ruleContent: pattern }, "allow"); } catch (err) { log.warn(`Failed to persist: ${err}`); }
				return undefined;
			}
			if (isChoice(choice, 1)) {
				return undefined;
			}
			return { block: true, reason: `Blocked dangerous command: ${label}` };
		}

		// Step 2: Normal permission check
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

		// Generate smart pattern suggestions for "Allow always"
		const suggestions = toolName.toLowerCase() === "bash"
			? suggestBashPatterns(ruleContent ?? "")
			: ["edit", "write", "read"].includes(toolName.toLowerCase())
				? suggestFilePatterns(ruleContent ?? "")
				: [];

		// ── No smart suggestions: simple 3-option prompt ──
		if (suggestions.length === 0) {
			const choice = await ctx.ui.select(
				`🔐 ${label}`,
				["1 Allow once", "2 Allow always", "3 Deny"],
			);

			if (isChoice(choice, 1)) {
				// Check progressive learning
				const suggestion = recordAllowOnce(tracker, toolName, ruleContent);
				if (suggestion) {
					const autoAccept = await ctx.ui.confirm(
						`💡 You've allowed ${suggestion.count}x similar commands. Allow ${suggestion.rule} always?`,
						"Allow prefix",
					);
					if (autoAccept) {
						manager.addRule(parseRuleString(suggestion.rule), "allow", "localSettings");
						try { persistRule(localSettingsPath, parseRuleString(suggestion.rule), "allow"); } catch (err) { log.warn(`Failed to persist: ${err}`); }
					}
				}
				return undefined;
			}

			if (isChoice(choice, 2)) {
				const pattern = generateSmartDefault(toolName, ruleContent);
				manager.addRule({ toolName, ruleContent: pattern }, "allow", "localSettings");
				try { persistRule(localSettingsPath, { toolName, ruleContent: pattern }, "allow"); } catch (err) { log.warn(`Failed to persist: ${err}`); }
				return undefined;
			}

			// Deny (3) or cancelled
			return { block: true, reason: `Blocked by user: ${label}` };
		}

		// ── Smart suggestions available ──
		const specificSuggestion = suggestions[0]; // e.g. "git push *"
		const broadSuggestion = suggestions[suggestions.length - 1]; // e.g. "git *"

		// Build options: Allow once, specific scope, broad scope (if different), Deny
		const options: string[] = ["1 Allow once"];

		if (specificSuggestion && broadSuggestion && specificSuggestion.pattern !== broadSuggestion.pattern) {
			// Two scope levels
			options.push(`2 Always: ${specificSuggestion.label}`);
			options.push(`3 Always: ${broadSuggestion.label}`);
			options.push("4 Deny");
		} else if (specificSuggestion) {
			// One scope level
			options.push(`2 Always: ${specificSuggestion.label}`);
			options.push("3 Deny");
		} else {
			// Fallback
			options.push("2 Allow always");
			options.push("3 Deny");
		}

		const choice = await ctx.ui.select(`🔐 ${label}`, options);

		// Allow once (1)
		if (isChoice(choice, 1)) {
			const suggestion = recordAllowOnce(tracker, toolName, ruleContent);
			if (suggestion) {
				const autoAccept = await ctx.ui.confirm(
					`💡 You've allowed ${suggestion.count}x similar commands. Allow ${suggestion.rule} always?`,
					"Allow prefix",
				);
				if (autoAccept) {
					manager.addRule(parseRuleString(suggestion.rule), "allow", "localSettings");
					try { persistRule(localSettingsPath, parseRuleString(suggestion.rule), "allow"); } catch (err) { log.warn(`Failed to persist: ${err}`); }
				}
			}
			return undefined;
		}

		// Specific scope (2)
		if (isChoice(choice, 2)) {
			manager.addRule({ toolName, ruleContent: specificSuggestion.pattern }, "allow", "localSettings");
			try { persistRule(localSettingsPath, { toolName, ruleContent: specificSuggestion.pattern }, "allow"); } catch (err) { log.warn(`Failed to persist: ${err}`); }
			return undefined;
		}

		// Broad scope (3) — only if we have both scope levels
		if (isChoice(choice, 3) && specificSuggestion && broadSuggestion && specificSuggestion.pattern !== broadSuggestion.pattern) {
			manager.addRule({ toolName, ruleContent: broadSuggestion.pattern }, "allow", "localSettings");
			try { persistRule(localSettingsPath, { toolName, ruleContent: broadSuggestion.pattern }, "allow"); } catch (err) { log.warn(`Failed to persist: ${err}`); }
			return undefined;
		}

		// Deny (last option) or cancelled
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
					...manager.getRulesFromSource("localSettings"),
					...manager.getRulesFromSource("session"),
				];

				if (allRules.length === 0) {
					ctx.ui.notify(
						`📋 Whitelist: (no rules)\n\nMode: ${mode}\n\n/whitelist allow|deny|deny-path|mode`,
						"info",
					);
				} else {
					const lines = allRules.map(
						(r) => `  ${r.ruleBehavior}: ${r.ruleValue.toolName}${r.ruleValue.ruleContent ? `(${r.ruleValue.ruleContent})` : ""} [${r.source}]`,
					);
					ctx.ui.notify(`📋 Whitelist (${allRules.length}):\n${lines.join("\n")}\n\nMode: ${mode}`, "info");
				}
				return;
			}

			if (subcommand === "allow" || subcommand === "deny") {
				const behavior = subcommand as PermissionBehavior;
				const toolStr = parts[1];
				if (!toolStr) {
					ctx.ui.notify(`Usage: /whitelist ${subcommand} <Tool> [pattern]\nE.g. /whitelist allow Bash "git *"`, "info");
					return;
				}
				manager.addRule(parseRuleString(toolStr), behavior, "session");
				ctx.ui.notify(`✅ ${behavior}: ${toolStr} (session)`, "info");
				return;
			}

			if (subcommand === "deny-path") {
				const pathPattern = parts[1];
				if (!pathPattern) {
					ctx.ui.notify(`Usage: /whitelist deny-path <glob>\nE.g. /whitelist deny-path ".env*"`, "info");
					return;
				}
				for (const tool of FILE_TOOLS) {
					manager.addRule({ toolName: tool, ruleContent: pathPattern }, "deny", "session");
				}
				ctx.ui.notify(`⛔ Path denied: ${pathPattern} (Read/Edit/Write, session)`, "info");
				return;
			}

			if (subcommand === "mode") {
				const newMode = parts[1];
				if (!newMode || !["default", "bypassPermissions", "plan", "acceptEdits", "dontAsk"].includes(newMode)) {
					ctx.ui.notify(
						`Mode: ${mode}\n\nOptions: default, bypassPermissions, plan, acceptEdits, dontAsk`,
						"info",
					);
					return;
				}
				manager.setMode(newMode as PermissionMode);
				ctx.ui.notify(`🔄 Mode → ${newMode}`, "info");
				return;
			}

			ctx.ui.notify(
				`Usage: /whitelist <status|allow|deny|deny-path|mode>`,
				"info",
			);
		},
	});

	log.info("Extension loaded — /whitelist command registered, tool_call gate active");
}