import type { PermissionRuleSource } from './types/index.js'

export const DEFAULT_ALLOW_RULES: readonly string[] = [
  'Read',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
]

export const SOURCE_PRECEDENCE: readonly PermissionRuleSource[] = [
  'userSettings',
  'projectSettings',
  'localSettings',
  'flagSettings',
  'policySettings',
  'cliArg',
  'command',
  'session',
] as const