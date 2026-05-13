import { z } from 'zod'

export const permissionBehaviorSchema = z.enum(['allow', 'deny', 'ask'])

export const permissionRuleValueSchema = z.object({
  toolName: z.string().min(1),
  ruleContent: z.string().optional(),
})

export const permissionRuleSchema = z.object({
  source: z.enum([
    'userSettings', 'projectSettings', 'localSettings',
    'flagSettings', 'policySettings', 'cliArg', 'command', 'session',
  ]),
  ruleBehavior: permissionBehaviorSchema,
  ruleValue: permissionRuleValueSchema,
})

export const permissionModeSchema = z.enum([
  'acceptEdits', 'bypassPermissions', 'default', 'dontAsk', 'plan',
])

export const permissionUpdateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('addRules'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    rules: z.array(permissionRuleValueSchema),
    behavior: permissionBehaviorSchema,
  }),
  z.object({
    type: z.literal('replaceRules'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    rules: z.array(permissionRuleValueSchema),
    behavior: permissionBehaviorSchema,
  }),
  z.object({
    type: z.literal('removeRules'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    rules: z.array(permissionRuleValueSchema),
    behavior: permissionBehaviorSchema,
  }),
  z.object({
    type: z.literal('setMode'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    mode: permissionModeSchema,
  }),
  z.object({
    type: z.literal('addDirectories'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    directories: z.array(z.string()),
  }),
  z.object({
    type: z.literal('removeDirectories'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    directories: z.array(z.string()),
  }),
])

export const permissionSettingsSchema = z.object({
  permissions: z.object({
    defaultMode: permissionModeSchema.optional(),
    allow: z.array(z.string()).default([]),
    deny: z.array(z.string()).default([]),
    ask: z.array(z.string()).default([]),
    additionalDirectories: z.array(z.string()).default([]),
  }),
})