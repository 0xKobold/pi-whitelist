import { describe, it, expect } from 'vitest'
import { READ_ONLY_TOOLS, isReadOnly } from '../src/readonly.js'
import { DANGEROUS_PATTERNS } from '../src/dangerous.js'
import { DEFAULT_ALLOW_RULES, SOURCE_PRECEDENCE } from '../src/constants.js'

describe('READ_ONLY_TOOLS', () => {
  it('contains expected read-only tools', () => {
    expect(READ_ONLY_TOOLS.has('Read')).toBe(true)
    expect(READ_ONLY_TOOLS.has('Glob')).toBe(true)
    expect(READ_ONLY_TOOLS.has('Grep')).toBe(true)
    expect(READ_ONLY_TOOLS.has('WebFetch')).toBe(true)
    expect(READ_ONLY_TOOLS.has('WebSearch')).toBe(true)
  })

  it('does not contain destructive tools', () => {
    expect(READ_ONLY_TOOLS.has('Bash')).toBe(false)
    expect(READ_ONLY_TOOLS.has('FileWrite')).toBe(false)
    expect(READ_ONLY_TOOLS.has('FileEdit')).toBe(false)
  })
})

describe('isReadOnly', () => {
  it('returns true for read-only tools', () => {
    expect(isReadOnly('Read')).toBe(true)
    expect(isReadOnly('Glob')).toBe(true)
    expect(isReadOnly('Grep')).toBe(true)
  })

  it('returns false for destructive tools', () => {
    expect(isReadOnly('Bash')).toBe(false)
    expect(isReadOnly('FileWrite')).toBe(false)
    expect(isReadOnly('FileEdit')).toBe(false)
  })
})

describe('DANGEROUS_PATTERNS', () => {
  it('has at least 5 dangerous patterns', () => {
    expect(DANGEROUS_PATTERNS.length).toBeGreaterThanOrEqual(5)
  })

  it('includes rm -rf patterns', () => {
    const hasRmForce = DANGEROUS_PATTERNS.some(
      p => p.toolName === 'Bash' && p.ruleContent?.includes('rm -rf')
    )
    expect(hasRmForce).toBe(true)
  })
})

describe('SOURCE_PRECEDENCE', () => {
  it('orders sources from lowest to highest priority', () => {
    expect(SOURCE_PRECEDENCE.indexOf('userSettings')).toBeLessThan(SOURCE_PRECEDENCE.indexOf('projectSettings'))
    expect(SOURCE_PRECEDENCE.indexOf('projectSettings')).toBeLessThan(SOURCE_PRECEDENCE.indexOf('localSettings'))
    expect(SOURCE_PRECEDENCE.indexOf('localSettings')).toBeLessThan(SOURCE_PRECEDENCE.indexOf('session'))
    expect(SOURCE_PRECEDENCE.indexOf('session')).toBe(SOURCE_PRECEDENCE.length - 1)
  })
})