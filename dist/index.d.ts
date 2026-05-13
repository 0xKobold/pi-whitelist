export { PermissionManager } from './manager.js';
export type { PermissionManagerOptions } from './manager.js';
export { checkPermission } from './check.js';
export type { PermissionBehavior, ExternalPermissionMode, InternalPermissionMode, PermissionMode, PermissionRuleSource, PermissionRuleValue, PermissionRule, PermissionCheckInput, PermissionAllowDecision, PermissionAskDecision, PermissionDenyDecision, PermissionDecision, PermissionDecisionReason, PermissionUpdateDestination, PermissionUpdate, WorkingDirectorySource, AdditionalWorkingDirectory, ToolPermissionContext, } from './types/index.js';
export { EXTERNAL_PERMISSION_MODES } from './types/index.js';
export { permissionBehaviorSchema, permissionRuleValueSchema, permissionRuleSchema, permissionModeSchema, permissionUpdateSchema, permissionSettingsSchema, } from './types/index.js';
export { parseRuleString, serializeRuleString, escapeRuleContent, unescapeRuleContent, } from './rules/index.js';
export { GlobMatcher, CommandMatcher, FileMatcher, MatcherRegistry } from './matchers/index.js';
export type { RuleMatcher } from './matchers/index.js';
export type { SettingsStore, PermissionSettings } from './storage/index.js';
export { MemorySettingsStore, FileSettingsStore, mergeSettings } from './storage/index.js';
export { READ_ONLY_TOOLS, isReadOnly } from './readonly.js';
export { DANGEROUS_PATTERNS } from './dangerous.js';
export { DEFAULT_ALLOW_RULES, SOURCE_PRECEDENCE } from './constants.js';
export { expandDenyPaths, FILE_TOOLS } from './deny-paths.js';
export { PermissionError, RuleParseError, StorageError, MatcherError } from './errors.js';
export type { PermissionErrorCode } from './errors.js';
//# sourceMappingURL=index.d.ts.map