import { describe, it, expect } from 'vitest'
import {
  EXTERNAL_PERMISSION_MODES,
  permissionBehaviorSchema,
  permissionRuleValueSchema,
  permissionRuleSchema,
  permissionModeSchema,
  permissionUpdateSchema,
} from '../src/types/index.js'

describe('type exports', () => {
  it('exports EXTERNAL_PERMISSION_MODES constant', () => {
    expect(EXTERNAL_PERMISSION_MODES).toEqual([
      'acceptEdits', 'bypassPermissions', 'default', 'dontAsk', 'plan',
    ])
  })

  it('validates permission behavior with zod', () => {
    expect(permissionBehaviorSchema.parse('allow')).toBe('allow')
    expect(permissionBehaviorSchema.parse('deny')).toBe('deny')
    expect(permissionBehaviorSchema.parse('ask')).toBe('ask')
    expect(() => permissionBehaviorSchema.parse('invalid')).toThrow()
  })

  it('validates rule value with zod', () => {
    const result = permissionRuleValueSchema.parse({ toolName: 'Bash', ruleContent: 'git *' })
    expect(result).toEqual({ toolName: 'Bash', ruleContent: 'git *' })

    const minimal = permissionRuleValueSchema.parse({ toolName: 'Read' })
    expect(minimal).toEqual({ toolName: 'Read' })

    expect(() => permissionRuleValueSchema.parse({ toolName: '' })).toThrow()
  })

  it('validates permission mode with zod', () => {
    expect(permissionModeSchema.parse('default')).toBe('default')
    expect(permissionModeSchema.parse('bypassPermissions')).toBe('bypassPermissions')
    expect(() => permissionModeSchema.parse('invalid')).toThrow()
  })

  it('validates addRules update with zod', () => {
    const update = permissionUpdateSchema.parse({
      type: 'addRules',
      destination: 'userSettings',
      rules: [{ toolName: 'Bash', ruleContent: 'git *' }],
      behavior: 'allow',
    })
    expect(update.type).toBe('addRules')
  })

  it('validates setMode update with zod', () => {
    const update = permissionUpdateSchema.parse({
      type: 'setMode',
      destination: 'userSettings',
      mode: 'default',
    })
    expect(update.type).toBe('setMode')
  })
})