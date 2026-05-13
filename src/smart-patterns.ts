/**
 * Smart pattern generation for "Allow always" suggestions.
 *
 * Parses command structure (verb, subcommand, args) and path structure
 * to offer graduated specificity levels instead of a single naive pattern.
 */

/** Common shell commands that have safe subcommands */
const COMMANDS_WITH_SUBCOMMANDS = new Set([
	'git', 'docker', 'npm', 'npx', 'yarn', 'pnpm', 'bun',
	'cargo', 'rustup', 'go', 'python3', 'python',
	'kubectl', 'helm', 'terraform', 'tf',
	'aws', 'gcloud', 'az',
	'pip', 'pip3', 'uv',
	'pipx', 'conda',
])

/**
 * Parse a bash command and return graduated pattern suggestions.
 * Returns patterns from most specific to most broad.
 */
export function suggestBashPatterns(command: string): SmartPattern[] {
	const patterns: SmartPattern[] = []
	const trimmed = command.trim()

	// Extract base command (first word)
	const firstSpace = trimmed.indexOf(' ')
	if (firstSpace === -1) {
		// Single command like "ls" or "pwd"
		patterns.push({ pattern: trimmed, scope: 'exact', label: `${trimmed} (exact command)` })
		return patterns
	}

	const baseCommand = trimmed.substring(0, firstSpace)
	const args = trimmed.substring(firstSpace + 1).trim()

	// Commands with subcommands: git push, npm run, docker build, etc.
	if (COMMANDS_WITH_SUBCOMMANDS.has(baseCommand)) {
		const secondSpace = args.indexOf(' ')
		const subcommand = secondSpace === -1 ? args : args.substring(0, secondSpace)

		// Specific: git push *
		patterns.push({
			pattern: `${baseCommand} ${subcommand} *`,
			scope: 'specific',
			label: `${baseCommand} ${subcommand} * (all ${baseCommand} ${subcommand})`,
		})

		// Broader: git *
		patterns.push({
			pattern: `${baseCommand} *`,
			scope: 'broad',
			label: `${baseCommand} * (all ${baseCommand} commands)`,
		})

		return patterns
	}

	// Compound commands with pipes/&&/|| — offer base command pattern
	if (/[;&|]/.test(args)) {
		patterns.push({
			pattern: `${baseCommand} *`,
			scope: 'broad',
			label: `${baseCommand} * (all ${baseCommand} commands, including compound)`,
		})
		return patterns
	}

	// Simple commands with args: cat file.txt, echo "hello"
	if (args.startsWith('-') || args.length > 0) {
		// If first arg is a flag, include it: ls -la → ls -la *
		const argParts = args.split(/\s+/)
		const flags = argParts.filter(a => a.startsWith('-')).join(' ')

		if (flags) {
			patterns.push({
				pattern: `${baseCommand} ${flags} *`,
				scope: 'specific',
				label: `${baseCommand} ${flags} * (with those flags)`,
			})
		}

		patterns.push({
			pattern: `${baseCommand} *`,
			scope: 'broad',
			label: `${baseCommand} * (all ${baseCommand} commands)`,
		})

		return patterns
	}

	// Fallback: base command + wildcard
	patterns.push({
		pattern: `${baseCommand} *`,
		scope: 'broad',
		label: `${baseCommand} * (all ${baseCommand} commands)`,
	})

	return patterns
}

/**
 * Parse a file path and return graduated pattern suggestions.
 */
export function suggestFilePatterns(filePath: string): SmartPattern[] {
	const patterns: SmartPattern[] = []

	// Exact file
	patterns.push({
		pattern: filePath,
		scope: 'exact',
		label: filePath,
	})

	// Directory glob: /src/utils/helpers.ts → /src/utils/**
	const lastSlash = filePath.lastIndexOf('/')
	if (lastSlash > 0) {
		const dir = filePath.substring(0, lastSlash)
		patterns.push({
			pattern: `${dir}/**`,
			scope: 'specific',
			label: `${dir}/** (directory and below)`,
		})
	}

	// Extension glob: helpers.ts → *.ts
	const lastDot = filePath.lastIndexOf('.')
	if (lastDot > 0) {
		const ext = filePath.substring(lastDot)
		patterns.push({
			pattern: `*${ext}`,
			scope: 'broad',
			label: `*${ext} (all ${ext} files)`,
		})
	}

	return patterns
}

/**
 * Generate the default pattern (used for "Allow always" quick option).
 * Returns the most specific smart pattern, falling back to simple heuristic.
 */
export function generateSmartDefault(toolName: string, ruleContent: string | undefined): string | undefined {
	if (!ruleContent) return undefined

	if (toolName.toLowerCase() === 'bash') {
		const suggestions = suggestBashPatterns(ruleContent)
		// Return the specific pattern (first suggestion, most targeted)
		return suggestions[0]?.pattern ?? ruleContent
	}

	// File tools — return the specific (exact or directory) pattern
	if (['edit', 'write', 'read'].includes(toolName.toLowerCase())) {
		const suggestions = suggestFilePatterns(ruleContent)
		// Return directory-level pattern (more useful than exact file)
		return suggestions.length > 1 ? suggestions[1].pattern : ruleContent
	}

	// Default: return as-is
	return ruleContent
}

export interface SmartPattern {
	pattern: string
	scope: 'exact' | 'specific' | 'broad'
	label: string
}