/**
 * Progressive learning — tracks "Allow once" patterns per session
 * and suggests broader rules when the same prefix is used repeatedly.
 */

export interface PrefixTracker {
	/** Map of command prefix → count of allow-once hits */
	prefixCounts: Map<string, number>
	/** Threshold to trigger suggestion */
	threshold: number
	/** Prefixes already suggested (don't suggest again) */
	suggested: Set<string>
}

export function createPrefixTracker(threshold = 3): PrefixTracker {
	return {
		prefixCounts: new Map(),
		threshold,
		suggested: new Set(),
	}
}

/**
 * Record a tool invocation that was allowed once.
 * Returns a suggestion if the prefix has hit the threshold.
 *
 * Tracks both the specific prefix (git push) and the base prefix (git).
 * The first to hit threshold wins.
 */
export function recordAllowOnce(
	tracker: PrefixTracker,
	toolName: string,
	ruleContent: string | undefined,
): PrefixSuggestion | null {
	if (!ruleContent) return null

	const prefixes = extractPrefixes(toolName, ruleContent)
	if (prefixes.length === 0) return null

	for (const prefix of prefixes) {
		const count = (tracker.prefixCounts.get(prefix) ?? 0) + 1
		tracker.prefixCounts.set(prefix, count)

		if (count >= tracker.threshold && !tracker.suggested.has(prefix)) {
			tracker.suggested.add(prefix)
			return {
				prefix,
				count,
				rule: `${toolName}(${prefix} *)`,
			}
		}
	}

	return null
}

/**
 * Extract command/path prefixes from a rule content string.
 * Returns multiple levels: specific (verb+subcommand) and broad (base verb).
 *
 * "git push origin main" → ["git push", "git"]
 * "npm run build" → ["npm run", "npm"]
 * "ls -la /tmp" → ["ls"]
 * "/src/utils/helpers.ts" → ["/src/utils"]
 */
function extractPrefixes(toolName: string, ruleContent: string): string[] {
	const prefixes: string[] = []

	if (toolName.toLowerCase() === 'bash') {
		const parts = ruleContent.trim().split(/\s+/)
		if (parts.length === 0) return []
		if (parts.length === 1) return [parts[0]]

		// If second word is a subcommand (no dash), offer both specific and broad
		const subcommandPattern = /^[a-zA-Z][\w.-]*$/
		if (subcommandPattern.test(parts[1]) && !parts[1].startsWith('-')) {
			prefixes.push(`${parts[0]} ${parts[1]}`) // specific: git push
			prefixes.push(parts[0])                    // broad: git
		} else {
			prefixes.push(parts[0]) // just base: ls
		}

		return prefixes
	}

	// File tools: take the directory portion
	if (['edit', 'write', 'read'].includes(toolName.toLowerCase())) {
		const lastSlash = ruleContent.lastIndexOf('/')
		if (lastSlash > 0) {
			prefixes.push(ruleContent.substring(0, lastSlash))
		}
	}

	return prefixes
}

export interface PrefixSuggestion {
	/** The common prefix detected */
	prefix: string
	/** Number of times this prefix was allowed */
	count: number
	/** The suggested rule string */
	rule: string
}