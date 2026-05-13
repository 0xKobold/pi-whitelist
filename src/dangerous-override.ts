/**
 * Dangerous override — always re-prompt for dangerous commands,
 * even if an allow rule exists. This prevents broad patterns like
 * Bash(git *) from accidentally allowing Bash(rm -rf /).
 *
 * Uses glob matching for path patterns and prefix matching for command patterns.
 */

import type { PermissionAskDecision, PermissionDenyDecision, PermissionRuleValue } from './types/index.js'
import { GlobMatcher } from './matchers/glob-matcher.js'

export const DANGEROUS_PATTERNS: readonly PermissionRuleValue[] = [
	{ toolName: 'Bash', ruleContent: 'rm -rf *' },
	{ toolName: 'Bash', ruleContent: 'rm -rf /' },
	{ toolName: 'Bash', ruleContent: 'sudo *' },
	{ toolName: 'Bash', ruleContent: 'chmod 777 *' },
	{ toolName: 'Bash', ruleContent: ':(){ :|:& };:' },
	{ toolName: 'filewrite', ruleContent: '/etc/*' },
	{ toolName: 'filewrite', ruleContent: '/usr/*' },
	{ toolName: 'filewrite', ruleContent: '/System/*' },
	// Also cover lowercase (pi sends lowercase)
	{ toolName: 'bash', ruleContent: 'rm -rf *' },
	{ toolName: 'bash', ruleContent: 'rm -rf /' },
	{ toolName: 'bash', ruleContent: 'sudo *' },
	{ toolName: 'bash', ruleContent: 'chmod 777 *' },
	{ toolName: 'bash', ruleContent: ':(){ :|:& };:' },
	{ toolName: 'write', ruleContent: '/etc/*' },
	{ toolName: 'write', ruleContent: '/usr/*' },
	{ toolName: 'write', ruleContent: '/System/*' },
]

const globMatcher = new GlobMatcher()

/**
 * Check if a tool invocation matches a dangerous pattern.
 * If so, return an ask decision that forces re-prompting.
 */
export function checkDangerousOverride(
	toolName: string,
	ruleContent: string | undefined,
): PermissionAskDecision | PermissionDenyDecision | null {
	for (const pattern of DANGEROUS_PATTERNS) {
		if (pattern.toolName.toLowerCase() !== toolName.toLowerCase()) continue

		const patternContent = pattern.ruleContent ?? ''
		const input = ruleContent ?? ''

		// Prefix matching for command patterns (e.g. "sudo *" matches "sudo rm ...")
		if (patternContent.endsWith(' *')) {
			const prefix = patternContent.slice(0, -2) // "sudo *" → "sudo"
			if (input === prefix || input.toLowerCase().startsWith(prefix.toLowerCase() + ' ')) {
				return {
					behavior: 'ask',
					message: `⚠️ Dangerous command: ${toolName}: ${ruleContent}`,
					decisionReason: { type: 'safetyCheck', reason: `Matches dangerous pattern: ${pattern.toolName}(${patternContent})` },
					suggestions: [{
						type: 'addRules' as const,
						destination: 'session' as const,
						rules: [{ toolName, ruleContent }],
						behavior: 'deny' as const,
					}],
				}
			}
		}

		// Exact matching for literal patterns (e.g. "rm -rf /")
		if (patternContent === input) {
			return {
				behavior: 'ask',
				message: `⚠️ Dangerous command: ${toolName}: ${ruleContent}`,
				decisionReason: { type: 'safetyCheck', reason: `Matches dangerous pattern: ${pattern.toolName}(${patternContent})` },
				suggestions: [{
					type: 'addRules' as const,
					destination: 'session' as const,
					rules: [{ toolName, ruleContent }],
					behavior: 'deny' as const,
				}],
			}
		}

		// Glob matching for path patterns (e.g. "/etc/*" matches "/etc/passwd")
		if (patternContent.includes('*') && globMatcher.matches(patternContent, input)) {
			return {
				behavior: 'ask',
				message: `⚠️ Dangerous command: ${toolName}: ${ruleContent}`,
				decisionReason: { type: 'safetyCheck', reason: `Matches dangerous pattern: ${pattern.toolName}(${patternContent})` },
				suggestions: [{
					type: 'addRules' as const,
					destination: 'session' as const,
					rules: [{ toolName, ruleContent }],
					behavior: 'deny' as const,
				}],
			}
		}
	}

	return null
}