import { describe, it, expect } from 'vitest'
import {
  parseRuleString,
  serializeRuleString,
  escapeRuleContent,
  unescapeRuleContent,
} from '../src/rules/parser.js'

describe('parseRuleString', () => {
  it('parses tool-only rule', () => {
    expect(parseRuleString('Bash')).toEqual({ toolName: 'Bash' })
  })

  it('parses rule with content', () => {
    expect(parseRuleString('Bash(git *)')).toEqual({ toolName: 'Bash', ruleContent: 'git *' })
  })

  it('parses rule with exact content', () => {
    expect(parseRuleString('Bash(npm test)')).toEqual({ toolName: 'Bash', ruleContent: 'npm test' })
  })

  it('parses rule with escaped parentheses', () => {
    expect(parseRuleString('Bash(python -c "print\\(1\\)")')).toEqual({
      toolName: 'Bash',
      ruleContent: 'python -c "print(1)"',
    })
  })

  it('parses rule with nested parentheses', () => {
    expect(parseRuleString('Bash(echo \\(hello\\))')).toEqual({
      toolName: 'Bash',
      ruleContent: 'echo (hello)',
    })
  })

  it('parses rule with path pattern', () => {
    expect(parseRuleString('FileEdit(/src/**)')).toEqual({
      toolName: 'FileEdit',
      ruleContent: '/src/**',
    })
  })

  it('parses Read tool with no content', () => {
    expect(parseRuleString('Read')).toEqual({ toolName: 'Read' })
  })

  it('handles empty content parentheses', () => {
    expect(parseRuleString('Bash()')).toEqual({ toolName: 'Bash', ruleContent: '' })
  })

  it('handles tool name with numbers', () => {
    expect(parseRuleString('Task1')).toEqual({ toolName: 'Task1' })
  })

  it('handles unicode in content', () => {
    expect(parseRuleString('Bash(echo café)')).toEqual({
      toolName: 'Bash',
      ruleContent: 'echo café',
    })
  })
})

describe('serializeRuleString', () => {
  it('serializes tool-only rule', () => {
    expect(serializeRuleString({ toolName: 'Bash' })).toBe('Bash')
  })

  it('serializes rule with content', () => {
    expect(serializeRuleString({ toolName: 'Bash', ruleContent: 'git *' })).toBe('Bash(git *)')
  })

  it('escapes parentheses in content', () => {
    expect(serializeRuleString({ toolName: 'Bash', ruleContent: 'python -c "print(1)"' })).toBe(
      'Bash(python -c "print\\(1\\)")'
    )
  })

  it('roundtrips with parse', () => {
    const rules = [
      { toolName: 'Bash', ruleContent: 'git *' },
      { toolName: 'Read' },
      { toolName: 'FileEdit', ruleContent: '/src/**' },
      { toolName: 'Bash', ruleContent: 'python -c "print(1)"' },
    ]
    for (const rule of rules) {
      expect(parseRuleString(serializeRuleString(rule))).toEqual(rule)
    }
  })
})

describe('escapeRuleContent', () => {
  it('escapes parentheses', () => {
    expect(escapeRuleContent('psycopg2.connect()')).toBe('psycopg2.connect\\(\\)')
  })

  it('escapes backslashes before parentheses', () => {
    expect(escapeRuleContent('echo "test\\nvalue"')).toBe('echo "test\\\\nvalue"')
  })

  it('leaves normal content unchanged', () => {
    expect(escapeRuleContent('git *')).toBe('git *')
  })
})

describe('unescapeRuleContent', () => {
  it('unescapes parentheses', () => {
    expect(unescapeRuleContent('psycopg2.connect\\(\\)')).toBe('psycopg2.connect()')
  })

  it('unescapes backslashes', () => {
    expect(unescapeRuleContent('echo "test\\\\nvalue"')).toBe('echo "test\\nvalue"')
  })

  it('roundtrips with escape', () => {
    const contents = [
      'psycopg2.connect()',
      'echo "test\\nvalue"',
      'normal content',
      'python -c "print(1)"',
    ]
    for (const content of contents) {
      expect(unescapeRuleContent(escapeRuleContent(content))).toBe(content)
    }
  })
})