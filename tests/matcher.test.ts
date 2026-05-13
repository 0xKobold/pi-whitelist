import { describe, it, expect } from 'vitest'
import { GlobMatcher } from '../src/matchers/glob-matcher.js'
import { CommandMatcher } from '../src/matchers/command-matcher.js'
import { FileMatcher } from '../src/matchers/file-matcher.js'
import { MatcherRegistry } from '../src/matchers/registry.js'

describe('GlobMatcher', () => {
  const matcher = new GlobMatcher()

  it('matches wildcard pattern', () => {
    expect(matcher.matches('/src/**', '/src/index.ts')).toBe(true)
  })

  it('matches star pattern', () => {
    expect(matcher.matches('*', 'anything')).toBe(true)
  })

  it('matches when ruleContent is undefined (matches all)', () => {
    expect(matcher.matches(undefined, 'anything')).toBe(true)
  })

  it('matches when both are undefined', () => {
    expect(matcher.matches(undefined, undefined)).toBe(true)
  })

  it('rejects non-matching glob', () => {
    expect(matcher.matches('/lib/**', '/src/index.ts')).toBe(false)
  })

  it('matches exact pattern', () => {
    expect(matcher.matches('npm test', 'npm test')).toBe(true)
  })

  it('rejects different exact pattern', () => {
    expect(matcher.matches('npm test', 'npm build')).toBe(false)
  })
})

describe('CommandMatcher', () => {
  const matcher = new CommandMatcher()

  it('matches prefix with wildcard', () => {
    expect(matcher.matches('git *', 'git commit -m "fix"')).toBe(true)
  })

  it('matches exact command', () => {
    expect(matcher.matches('npm test', 'npm test')).toBe(true)
  })

  it('matches command prefix without wildcard', () => {
    expect(matcher.matches('npm', 'npm run build')).toBe(true)
  })

  it('rejects non-matching command', () => {
    expect(matcher.matches('rm *', 'echo hello')).toBe(false)
  })

  it('matches compound command with &&', () => {
    expect(matcher.matches('git *', 'git status && npm test')).toBe(true)
  })

  it('matches compound command with ||', () => {
    expect(matcher.matches('npm', 'npm test || echo failed')).toBe(true)
  })

  it('matches compound command with ;', () => {
    expect(matcher.matches('rm *', 'rm -rf /tmp; echo done')).toBe(true)
  })

  it('matches compound command with |', () => {
    expect(matcher.matches('git', 'git log | head -5')).toBe(true)
  })

  it('matches when ruleContent is undefined', () => {
    expect(matcher.matches(undefined, 'anything')).toBe(true)
  })

  it('rejects empty input', () => {
    expect(matcher.matches('git *', '')).toBe(false)
  })

  it('matches prefix without wildcard', () => {
    expect(matcher.matches('npm', 'npm test')).toBe(true)
  })
})

describe('FileMatcher', () => {
  const matcher = new FileMatcher()

  it('matches directory glob pattern', () => {
    expect(matcher.matches('/src/**', '/src/index.ts')).toBe(true)
  })

  it('rejects non-matching directory', () => {
    expect(matcher.matches('/src/**', '/lib/index.ts')).toBe(false)
  })

  it('matches extension pattern with basename', () => {
    expect(matcher.matches('*.ts', 'index.ts')).toBe(true)
  })

  it('matches recursive pattern with extension for paths', () => {
    expect(matcher.matches('/src/**/*.ts', '/src/index.ts')).toBe(true)
  })

  it('rejects non-matching extension', () => {
    expect(matcher.matches('*.ts', '/src/index.js')).toBe(false)
  })

  it('normalizes Windows paths to POSIX', () => {
    expect(matcher.matches('/src/**', 'C:\\src\\index.ts')).toBe(true)
  })

  it('matches when ruleContent is undefined', () => {
    expect(matcher.matches(undefined, '/any/path')).toBe(true)
  })

  it('matches star pattern on simple strings', () => {
    expect(matcher.matches('*', 'anything')).toBe(true)
  })

  it('matches double-star pattern for paths', () => {
    expect(matcher.matches('/**', '/src/index.ts')).toBe(true)
  })
})

describe('MatcherRegistry', () => {
  it('registers and retrieves matchers', () => {
    const registry = new MatcherRegistry()
    const cmdMatcher = new CommandMatcher()
    registry.register(cmdMatcher)
    expect(registry.get('Bash')).toBe(cmdMatcher)
  })

  it('returns GlobMatcher for unregistered tools', () => {
    const registry = new MatcherRegistry()
    const matcher = registry.get('UnknownTool')
    expect(matcher).toBeInstanceOf(GlobMatcher)
  })

  it('allows overriding default matcher', () => {
    const registry = new MatcherRegistry()
    const fileMatcher = new FileMatcher()
    registry.register(fileMatcher)
    expect(registry.get('FileEdit')).toBe(fileMatcher)
  })
})