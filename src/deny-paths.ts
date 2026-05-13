/**
 * Expand denyPaths globs into deny rule strings for file tools.
 *
 * @example
 * expandDenyPaths(['.env*'])
 * // → ['Read(.env*)', 'Edit(.env*)', 'Write(.env*)', 'read(.env*)', 'edit(.env*)', 'write(.env*)']
 */

/** Tools that operate on file paths — denyPaths expands into deny rules for these */
export const FILE_TOOLS = ['Read', 'Edit', 'Write', 'read', 'edit', 'write'] as const

export function expandDenyPaths(denyPaths: string[]): string[] {
	const rules: string[] = []
	for (const pattern of denyPaths) {
		for (const tool of FILE_TOOLS) {
			rules.push(`${tool}(${pattern})`)
		}
	}
	return rules
}