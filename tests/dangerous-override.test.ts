import { describe, it, expect } from 'vitest'
import { checkDangerousOverride } from '../src/dangerous-override.js'

describe('checkDangerousOverride', () => {
	it('flags rm -rf commands', () => {
		const result = checkDangerousOverride('bash', 'rm -rf /tmp/foo')
		expect(result).not.toBeNull()
		expect(result?.behavior).toBe('ask')
		expect(result?.decisionReason?.type).toBe('safetyCheck')
	})

	it('flags sudo commands', () => {
		const result = checkDangerousOverride('bash', 'sudo apt install foo')
		expect(result).not.toBeNull()
		expect(result?.behavior).toBe('ask')
	})

	it('flags chmod 777', () => {
		const result = checkDangerousOverride('bash', 'chmod 777 /tmp')
		expect(result).not.toBeNull()
		expect(result?.behavior).toBe('ask')
	})

	it('flags writes to /etc (PascalCase)', () => {
		const result = checkDangerousOverride('Write', '/etc/passwd')
		expect(result).not.toBeNull()
		expect(result?.behavior).toBe('ask')
	})

	it('flags writes to /etc (lowercase)', () => {
		const result = checkDangerousOverride('write', '/etc/passwd')
		expect(result).not.toBeNull()
		expect(result?.behavior).toBe('ask')
	})

	it('does not flag safe commands', () => {
		expect(checkDangerousOverride('bash', 'git status')).toBeNull()
		expect(checkDangerousOverride('bash', 'ls -la')).toBeNull()
		expect(checkDangerousOverride('read', '/src/index.ts')).toBeNull()
	})

	it('handles PascalCase tool names', () => {
		const result = checkDangerousOverride('Bash', 'rm -rf /tmp')
		expect(result).not.toBeNull()
	})

	it('handles lowercase tool names', () => {
		const result = checkDangerousOverride('bash', 'sudo rm /foo')
		expect(result).not.toBeNull()
	})
})