import { describe, it, expect } from 'vitest'
import { PermissionError, RuleParseError, StorageError, MatcherError } from '../src/errors.js'

describe('PermissionError', () => {
  it('creates error with code and details', () => {
    const err = new PermissionError('test', 'RULE_PARSE_ERROR', { key: 'value' })
    expect(err.name).toBe('PermissionError')
    expect(err.code).toBe('RULE_PARSE_ERROR')
    expect(err.details).toEqual({ key: 'value' })
    expect(err.message).toBe('test')
  })
})

describe('RuleParseError', () => {
  it('creates error with rule string and reason', () => {
    const err = new RuleParseError('Bash((', 'unexpected paren')
    expect(err.name).toBe('RuleParseError')
    expect(err.code).toBe('RULE_PARSE_ERROR')
    expect(err.details).toEqual({ ruleString: 'Bash((', reason: 'unexpected paren' })
  })
})

describe('StorageError', () => {
  it('creates error with path and cause', () => {
    const cause = new Error('ENOENT')
    const err = new StorageError('/path/to/settings.json', cause)
    expect(err.name).toBe('StorageError')
    expect(err.code).toBe('STORAGE_ERROR')
    expect(err.message).toContain('/path/to/settings.json')
  })
})

describe('MatcherError', () => {
  it('creates error with tool name and pattern', () => {
    const cause = new Error('invalid glob')
    const err = new MatcherError('Bash', '[[[broken', cause)
    expect(err.name).toBe('MatcherError')
    expect(err.code).toBe('MATCHER_ERROR')
    expect(err.message).toContain('Bash')
  })
})