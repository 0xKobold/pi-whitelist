import { describe, it, expect } from 'vitest'
import { createPrefixTracker, recordAllowOnce } from '../src/progressive-learning.js'

describe('progressive learning', () => {
	it('does not suggest below threshold', () => {
		const tracker = createPrefixTracker(3)
		expect(recordAllowOnce(tracker, 'bash', 'git status')).toBeNull()
		expect(recordAllowOnce(tracker, 'bash', 'git log')).toBeNull()
	})

	it('suggests at threshold when base prefix hits', () => {
		const tracker = createPrefixTracker(3)
		// "git status" tracks both "git status" and "git"
		// "git log" tracks both "git log" and "git"
		// "git diff" tracks both "git diff" and "git" — "git" hits 3
		recordAllowOnce(tracker, 'bash', 'git status')
		recordAllowOnce(tracker, 'bash', 'git log')
		const suggestion = recordAllowOnce(tracker, 'bash', 'git diff')
		expect(suggestion).not.toBeNull()
		expect(suggestion?.prefix).toBe('git')
		expect(suggestion?.count).toBe(3)
		expect(suggestion?.rule).toBe('bash(git *)')
	})

	it('does not suggest same prefix twice', () => {
		const tracker = createPrefixTracker(3)
		recordAllowOnce(tracker, 'bash', 'git status')
		recordAllowOnce(tracker, 'bash', 'git log')
		const first = recordAllowOnce(tracker, 'bash', 'git diff')
		expect(first).not.toBeNull()
		expect(first?.prefix).toBe('git')

		// Already suggested "git" — won't suggest again
		const fourth = recordAllowOnce(tracker, 'bash', 'git branch')
		// "git" already suggested at 3, so no new suggestion even though count goes to 4
		expect(fourth).toBeNull()
	})

	it('tracks different prefixes independently', () => {
		const tracker = createPrefixTracker(2)
		recordAllowOnce(tracker, 'bash', 'git status')
		// "git" has count 1, "git status" has count 1
		const gitSuggestion = recordAllowOnce(tracker, 'bash', 'git log')
		// "git" has count 2 — triggers
		expect(gitSuggestion?.prefix).toBe('git')

		recordAllowOnce(tracker, 'bash', 'npm test')
		const npmSuggestion = recordAllowOnce(tracker, 'bash', 'npm run build')
		// "npm" has count 2 — triggers
		expect(npmSuggestion?.prefix).toBe('npm')
	})

	it('returns null for content-less invocations', () => {
		const tracker = createPrefixTracker(3)
		expect(recordAllowOnce(tracker, 'bash', undefined)).toBeNull()
	})

	it('handles file path prefixes', () => {
		const tracker = createPrefixTracker(2)
		recordAllowOnce(tracker, 'edit', '/src/utils/helpers.ts')
		const suggestion = recordAllowOnce(tracker, 'edit', '/src/utils/index.ts')
		expect(suggestion).not.toBeNull()
		expect(suggestion?.prefix).toBe('/src/utils')
	})
})