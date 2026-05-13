import { describe, it, expect } from 'vitest'
import { suggestBashPatterns, suggestFilePatterns, generateSmartDefault } from '../src/smart-patterns.js'

describe('suggestBashPatterns', () => {
	it('suggests specific + broad for git commands with subcommand', () => {
		const result = suggestBashPatterns('git push origin main')
		expect(result.length).toBeGreaterThanOrEqual(2)
		expect(result[0].pattern).toBe('git push *')
		expect(result[0].scope).toBe('specific')
		expect(result[1].pattern).toBe('git *')
		expect(result[1].scope).toBe('broad')
	})

	it('handles single-word commands', () => {
		const result = suggestBashPatterns('ls')
		expect(result).toHaveLength(1)
		expect(result[0].pattern).toBe('ls')
		expect(result[0].scope).toBe('exact')
	})

	it('handles commands with flags', () => {
		const result = suggestBashPatterns('ls -la /tmp')
		expect(result.some(r => r.pattern === 'ls -la *')).toBe(true)
		expect(result.some(r => r.pattern === 'ls *')).toBe(true)
	})

	it('handles npm run build', () => {
		const result = suggestBashPatterns('npm run build')
		expect(result[0].pattern).toBe('npm run *')
		expect(result[1].pattern).toBe('npm *')
	})

	it('handles docker build commands', () => {
		const result = suggestBashPatterns('docker build -t myapp .')
		expect(result[0].pattern).toBe('docker build *')
	})

	it('handles compound commands with pipes', () => {
		const result = suggestBashPatterns('cat file.txt | grep foo')
		expect(result[0].pattern).toBe('cat *')
	})

	it('handles command with glob chars unchanged', () => {
		const result = suggestBashPatterns('find /src -name "*.ts"')
		// 'find' is not in COMMANDS_WITH_SUBCOMMANDS, so it should offer find *
		expect(result.some(r => r.pattern === 'find *')).toBe(true)
	})
})

describe('suggestFilePatterns', () => {
	it('suggests exact + directory + extension for file paths', () => {
		const result = suggestFilePatterns('/src/utils/helpers.ts')
		expect(result[0].pattern).toBe('/src/utils/helpers.ts')
		expect(result[0].scope).toBe('exact')
		expect(result[1].pattern).toBe('/src/utils/**')
		expect(result[1].scope).toBe('specific')
		expect(result.some(r => r.pattern === '*.ts')).toBe(true)
	})

	it('handles files without directory', () => {
		const result = suggestFilePatterns('package.json')
		expect(result[0].pattern).toBe('package.json')
		expect(result.some(r => r.pattern === '*.json')).toBe(true)
	})

	it('handles root-level files', () => {
		const result = suggestFilePatterns('/etc/hosts')
		expect(result[0].pattern).toBe('/etc/hosts')
		expect(result[1].pattern).toBe('/etc/**')
	})
})

describe('generateSmartDefault', () => {
	it('generates specific pattern for bash commands', () => {
		const result = generateSmartDefault('bash', 'git push origin main')
		expect(result).toBe('git push *')
	})

	it('generates directory pattern for file paths', () => {
		const result = generateSmartDefault('edit', '/src/utils/helpers.ts')
		expect(result).toBe('/src/utils/**')
	})

	it('returns undefined for empty content', () => {
		expect(generateSmartDefault('bash', undefined)).toBeUndefined()
	})
})