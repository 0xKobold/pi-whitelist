/**
 * pi-whitelist — Tool Permission Extension for pi-coding-agent
 *
 * Gates all tool calls through the tri-state permission system (allow/deny/ask).
 * Uses a hybrid prompt: ctx.ui.select() for arrow-key nav + ctx.ui.onTerminalInput()
 * for instant number-key selection (press 1/2/3 without Enter).
 * Supports denyPaths, smart pattern suggestions, progressive learning, and dangerous overrides.
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

/**
 * Hybrid prompt that accepts both arrow-key selection AND number-key shortcuts.
 *
 * Shows a select dialog (navigate with arrows, confirm with Enter)
 * AND listens for raw number keypresses (1-9) for instant selection.
 * Whichever input method fires first wins.
 *
 * Returns the 1-based option number, or 0 if cancelled.
 */
async function numberedPrompt(
	ctx: ExtensionContext,
	title: string,
	options: string[],
): Promise<number> {
	if (!ctx.hasUI) return 0;

	return new Promise<number>((resolve) => {
		let settled = false;

		// Listen for number keypresses (1-9) for instant selection
		const unsubscribe = ctx.ui.onTerminalInput((data: string) => {
			if (settled) return undefined;
			const num = parseInt(data, 10);
			if (num >= 1 && num <= options.length) {
				settled = true;
				resolve(num);
				return { consume: true };
			}
			return undefined;
		});

		// Also show select dialog (arrow keys + Enter)
		ctx.ui.select(title, options).then((choice) => {
			if (settled) {
				unsubscribe();
				return;
			}
			settled = true;
			unsubscribe();
			if (!choice) {
				resolve(0); // cancelled
				return;
			}
			const idx = options.indexOf(choice);
			resolve(idx >= 0 ? idx + 1 : 0);
		}).catch(() => {
			if (!settled) {
				settled = true;
				unsubscribe();
				resolve(0);
			}
		});

		// Safety: clean up listener if neither fires within 5 minutes
		setTimeout(() => {
			if (!settled) {
				settled = true;
				unsubscribe();
				resolve(0);
			}
		}, 300_000);
	});
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

	log.info(`Ready — mode: ${manager.getMode()}, global: ${globalStats ? `${globalStats.totalRules}r + ${globalStats.totalDenyPaths}p` : 'none'}, project: ${projectStats ? `${projectStats.totalRules}r + ${projectStats.totalDenyPaths}p` : 'none'}, local: ${localStats ? `${localStats.totalRules}r + ${localStats.totalDenyPaths}p` : 'none'}`);

	// ──── Tool Call Gate ────
	pi.on("tool_call", async (event: any, ctx: ExtensionContext) => {
		const toolName = event.toolName as string;
		const ruleContent = extractRuleContent(toolName, event.input as Record<string, unknown>);

		// Step 0: Bypass mode — skip all checks, allow everything
		if (manager.getMode() === 'bypassPermissions') {
			return undefined;
		}

		// Step 1: Dangerous override — always re-prompt for dangerous commands
		const dangerousOverride = checkDangerousOverride(toolName, ruleContent);
		if (dangerousOverride) {
			if (!ctx.hasUI) {
				return { block: true, reason: dangerousOverride.message };
			}
			const label = ruleContent ? `${toolName}: ${ruleContent}` : toolName;
			const choice = await numberedPrompt(ctx,
				`⚠️  ${label}\n\nDangerous command. Allow anyway?`,
				["1 Allow once", "2 Allow always", "3 Deny"],
			);

			if (choice === 2) {
				const pattern = generateSmartDefault(toolName, ruleContent);
				manager.addRule({ toolName, ruleContent: pattern }, "allow", "localSettings");
				try { persistRule(localSettingsPath, { toolName, ruleContent: pattern }, "allow"); } catch (err) { log.warn(`Failed to persist: ${err}`); }
				return undefined;
			}
			if (choice === 1) {
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
			const choice = await numberedPrompt(ctx,
				`🔐 ${label}`,
				["1 Allow once", "2 Allow always", "3 Deny"],
			);

			if (choice === 1) {
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

			if (choice === 2) {
				const pattern = generateSmartDefault(toolName, ruleContent);
				manager.addRule({ toolName, ruleContent: pattern }, "allow", "localSettings");
				try { persistRule(localSettingsPath, { toolName, ruleContent: pattern }, "allow"); } catch (err) { log.warn(`Failed to persist: ${err}`); }
				return undefined;
			}

			// 3 = Deny, 0 = cancelled
			return { block: true, reason: `Blocked by user: ${label}` };
		}

		// ── Smart suggestions available ──
		const specificSuggestion = suggestions[0]; // e.g. "git push *"
		const broadSuggestion = suggestions[suggestions.length - 1]; // e.g. "git *"

		const hasTwoScopes = specificSuggestion && broadSuggestion && specificSuggestion.pattern !== broadSuggestion.pattern;

		let options: string[];
		if (hasTwoScopes) {
			options = [
				"1 Allow once",
				`2 Always: ${specificSuggestion.label}`,
				`3 Always: ${broadSuggestion.label}`,
				"4 Deny",
			];
		} else {
			options = [
				"1 Allow once",
				`2 Always: ${specificSuggestion?.label ?? "all"}`,
				"3 Deny",
			];
		}

		const choice = await numberedPrompt(ctx, `🔐 ${label}`, options);

		if (choice === 1) {
			// Allow once + progressive learning
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

		if (choice === 2) {
			// Specific scope
			manager.addRule({ toolName, ruleContent: specificSuggestion.pattern }, "allow", "localSettings");
			try { persistRule(localSettingsPath, { toolName, ruleContent: specificSuggestion.pattern }, "allow"); } catch (err) { log.warn(`Failed to persist: ${err}`); }
			return undefined;
		}

		if (choice === 3 && hasTwoScopes) {
			// Broad scope
			manager.addRule({ toolName, ruleContent: broadSuggestion!.pattern }, "allow", "localSettings");
			try { persistRule(localSettingsPath, { toolName, ruleContent: broadSuggestion!.pattern }, "allow"); } catch (err) { log.warn(`Failed to persist: ${err}`); }
			return undefined;
		}

		// maxOption = Deny, 0 = cancelled, or invalid
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
						`📋 Whitelist: (no rules)\n\nMode: ${manager.getMode()}\n\n/whitelist allow|deny|deny-path|mode`,
						"info",
					);
				} else {
					const lines = allRules.map(
						(r) => `  ${r.ruleBehavior}: ${r.ruleValue.toolName}${r.ruleValue.ruleContent ? `(${r.ruleValue.ruleContent})` : ""} [${r.source}]`,
					);
					ctx.ui.notify(`📋 Whitelist (${allRules.length}):\n${lines.join("\n")}\n\nMode: ${manager.getMode()}`, "info");
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
						`Mode: ${manager.getMode()}\n\nOptions: default · bypassPermissions (off) · plan · acceptEdits · dontAsk`,
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