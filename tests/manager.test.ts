import { describe, it, expect } from 'vitest'
import { PermissionManager } from '../src/manager.js'

describe('PermissionManager', () => {
  describe('check() — default mode', () => {
    it('allows read-only tools without rules', () => {
      const manager = new PermissionManager()
      const decision = manager.check({ toolName: 'Read' })
      expect(decision.behavior).toBe('allow')
    })

    it('asks for destructive tools without rules', () => {
      const manager = new PermissionManager()
      const decision = manager.check({ toolName: 'Bash' })
      expect(decision.behavior).toBe('ask')
    })

    it('allows when matching allow rule exists', () => {
      const manager = new PermissionManager()
      manager.addRule({ toolName: 'Bash', ruleContent: 'git *' }, 'allow', 'session')
      manager.invalidateCache()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'git status' })
      expect(decision.behavior).toBe('allow')
    })

    it('denies when matching deny rule exists', () => {
      const manager = new PermissionManager()
      manager.addRule({ toolName: 'Bash', ruleContent: 'rm -rf *' }, 'deny', 'session')
      manager.invalidateCache()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /tmp' })
      expect(decision.behavior).toBe('deny')
    })

    it('deny takes precedence over allow', () => {
      const manager = new PermissionManager()
      manager.addRule({ toolName: 'Bash', ruleContent: 'npm *' }, 'allow', 'session')
      manager.addRule({ toolName: 'Bash', ruleContent: 'npm *' }, 'deny', 'session')
      manager.invalidateCache()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'npm test' })
      expect(decision.behavior).toBe('deny')
    })

    it('asks when ask rule matches', () => {
      const manager = new PermissionManager()
      manager.addRule({ toolName: 'Bash', ruleContent: 'npm *' }, 'ask', 'session')
      manager.invalidateCache()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'npm test' })
      expect(decision.behavior).toBe('ask')
    })

    it('deny is checked before allow', () => {
      const manager = new PermissionManager()
      manager.addRule({ toolName: 'Bash', ruleContent: 'git *' }, 'allow', 'session')
      manager.addRule({ toolName: 'Bash', ruleContent: 'rm -rf *' }, 'deny', 'session')
      manager.invalidateCache()
      const denyDecision = manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /tmp' })
      expect(denyDecision.behavior).toBe('deny')
    })
  })

  describe('check() — bypassPermissions mode', () => {
    it('always allows in bypass mode', () => {
      const manager = new PermissionManager({ mode: 'bypassPermissions' })
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /' })
      expect(decision.behavior).toBe('allow')
      if (decision.behavior === 'allow') {
        expect(decision.decisionReason).toEqual({ type: 'mode', mode: 'bypassPermissions' })
      }
    })
  })

  describe('check() — plan mode', () => {
    it('asks for everything in plan mode, even read-only tools', () => {
      const manager = new PermissionManager({ mode: 'plan' })
      const decision = manager.check({ toolName: 'Read' })
      expect(decision.behavior).toBe('ask')
    })
  })

  describe('check() — dontAsk mode', () => {
    it('allows everything not explicitly denied', () => {
      const manager = new PermissionManager({ mode: 'dontAsk' })
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'docker build .' })
      expect(decision.behavior).toBe('allow')
    })

    it('still denies explicitly denied commands', () => {
      const manager = new PermissionManager({ mode: 'dontAsk' })
      manager.addRule({ toolName: 'Bash', ruleContent: 'rm -rf *' }, 'deny', 'session')
      manager.invalidateCache()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /tmp' })
      expect(decision.behavior).toBe('deny')
    })
  })

  describe('addRule()', () => {
    it('adds a rule and allows matching invocations', () => {
      const manager = new PermissionManager()
      manager.addRule({ toolName: 'Bash', ruleContent: 'docker *' }, 'allow', 'session')
      manager.invalidateCache()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'docker build .' })
      expect(decision.behavior).toBe('allow')
    })
  })

  describe('removeRule()', () => {
    it('removes a rule', () => {
      const manager = new PermissionManager()
      manager.addRule({ toolName: 'Bash', ruleContent: 'git *' }, 'allow', 'session')
      manager.invalidateCache()
      expect(manager.check({ toolName: 'Bash', ruleContent: 'git status' }).behavior).toBe('allow')

      manager.removeRule({ toolName: 'Bash', ruleContent: 'git *' }, 'allow', 'session')
      manager.invalidateCache()
      expect(manager.check({ toolName: 'Bash', ruleContent: 'git status' }).behavior).toBe('ask')
    })
  })

  describe('setMode()', () => {
    it('changes the permission mode', () => {
      const manager = new PermissionManager()
      expect(manager.check({ toolName: 'Bash' }).behavior).toBe('ask')

      manager.setMode('bypassPermissions')
      expect(manager.check({ toolName: 'Bash' }).behavior).toBe('allow')
    })
  })

  describe('convenience methods', () => {
    it('isBashAllowed checks Bash tool', () => {
      const manager = new PermissionManager()
      manager.addRule({ toolName: 'Bash', ruleContent: 'git *' }, 'allow', 'session')
      manager.invalidateCache()
      expect(manager.isBashAllowed('git status')).toBe(true)
      expect(manager.isBashAllowed('npm test')).toBe(false)
    })

    it('isFileEditAllowed checks FileEdit tool', () => {
      const manager = new PermissionManager()
      manager.addRule({ toolName: 'FileEdit', ruleContent: '/src/**' }, 'allow', 'session')
      manager.invalidateCache()
      expect(manager.isFileEditAllowed('/src/index.ts')).toBe(true)
      expect(manager.isFileEditAllowed('/lib/index.ts')).toBe(false)
    })

    it('getRulesForTool returns matching rules', () => {
      const manager = new PermissionManager()
      manager.addRule({ toolName: 'Bash', ruleContent: 'git *' }, 'allow', 'session')
      manager.addRule({ toolName: 'Bash', ruleContent: 'npm test' }, 'allow', 'session')
      manager.addRule({ toolName: 'Bash', ruleContent: 'rm -rf *' }, 'deny', 'session')
      const rules = manager.getRulesForTool('Bash')
      expect(rules.length).toBe(3)
    })
  })

  describe('applyUpdates()', () => {
    it('applies batch updates', () => {
      const manager = new PermissionManager()
      manager.applyUpdates([
        { type: 'addRules', destination: 'session', rules: [{ toolName: 'Bash', ruleContent: 'git *' }], behavior: 'allow' },
        { type: 'setMode', destination: 'session', mode: 'default' },
      ])
      expect(manager.check({ toolName: 'Bash', ruleContent: 'git status' }).behavior).toBe('allow')
    })
  })
})