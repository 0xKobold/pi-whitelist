import type { PermissionRuleValue } from './types/index.js'

export const DANGEROUS_PATTERNS: readonly PermissionRuleValue[] = [
  { toolName: 'Bash', ruleContent: 'rm -rf *' },
  { toolName: 'Bash', ruleContent: 'rm -rf /' },
  { toolName: 'Bash', ruleContent: 'sudo *' },
  { toolName: 'Bash', ruleContent: 'chmod 777 *' },
  { toolName: 'Bash', ruleContent: ':(){ :|:& };:' },
  { toolName: 'FileWrite', ruleContent: '/etc/*' },
  { toolName: 'FileWrite', ruleContent: '/usr/*' },
  { toolName: 'FileWrite', ruleContent: '/System/*' },
]