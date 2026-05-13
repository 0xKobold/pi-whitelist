export type PermissionBehavior = 'allow' | 'deny' | 'ask';
export declare const EXTERNAL_PERMISSION_MODES: readonly ["acceptEdits", "bypassPermissions", "default", "dontAsk", "plan"];
export type ExternalPermissionMode = (typeof EXTERNAL_PERMISSION_MODES)[number];
export type InternalPermissionMode = ExternalPermissionMode | 'auto';
export type PermissionMode = InternalPermissionMode;
export type PermissionRuleSource = 'userSettings' | 'projectSettings' | 'localSettings' | 'flagSettings' | 'policySettings' | 'cliArg' | 'command' | 'session';
export type PermissionRuleValue = {
    toolName: string;
    ruleContent?: string;
};
export type PermissionRule = {
    source: PermissionRuleSource;
    ruleBehavior: PermissionBehavior;
    ruleValue: PermissionRuleValue;
};
export type PermissionCheckInput = {
    toolName: string;
    ruleContent?: string;
    workingDirectory?: string;
};
export type PermissionAllowDecision = {
    behavior: 'allow';
    updatedInput?: PermissionCheckInput;
    userModified?: boolean;
    decisionReason: PermissionDecisionReason;
};
export type PermissionAskDecision = {
    behavior: 'ask';
    message: string;
    updatedInput?: PermissionCheckInput;
    decisionReason?: PermissionDecisionReason;
    suggestions?: PermissionUpdate[];
    blockedPath?: string;
};
export type PermissionDenyDecision = {
    behavior: 'deny';
    message: string;
    decisionReason: PermissionDecisionReason;
};
export type PermissionDecision = PermissionAllowDecision | PermissionAskDecision | PermissionDenyDecision;
export type PermissionDecisionReason = {
    type: 'rule';
    rule: PermissionRule;
} | {
    type: 'mode';
    mode: PermissionMode;
} | {
    type: 'subcommandResults';
    reasons: Map<string, PermissionDecisionReason>;
} | {
    type: 'workingDir';
    reason: string;
} | {
    type: 'safetyCheck';
    reason: string;
} | {
    type: 'other';
    reason: string;
};
export type PermissionUpdateDestination = 'userSettings' | 'projectSettings' | 'localSettings' | 'session' | 'cliArg';
export type PermissionUpdate = {
    type: 'addRules';
    destination: PermissionUpdateDestination;
    rules: PermissionRuleValue[];
    behavior: PermissionBehavior;
} | {
    type: 'replaceRules';
    destination: PermissionUpdateDestination;
    rules: PermissionRuleValue[];
    behavior: PermissionBehavior;
} | {
    type: 'removeRules';
    destination: PermissionUpdateDestination;
    rules: PermissionRuleValue[];
    behavior: PermissionBehavior;
} | {
    type: 'setMode';
    destination: PermissionUpdateDestination;
    mode: ExternalPermissionMode;
} | {
    type: 'addDirectories';
    destination: PermissionUpdateDestination;
    directories: string[];
} | {
    type: 'removeDirectories';
    destination: PermissionUpdateDestination;
    directories: string[];
};
export type WorkingDirectorySource = PermissionRuleSource;
export type AdditionalWorkingDirectory = {
    path: string;
    source: WorkingDirectorySource;
};
export type ToolPermissionContext = {
    readonly mode: PermissionMode;
    readonly additionalWorkingDirectories: ReadonlyMap<string, AdditionalWorkingDirectory>;
    readonly alwaysAllowRules: Partial<Record<PermissionRuleSource, string[]>>;
    readonly alwaysDenyRules: Partial<Record<PermissionRuleSource, string[]>>;
    readonly alwaysAskRules: Partial<Record<PermissionRuleSource, string[]>>;
    readonly isBypassPermissionsModeAvailable: boolean;
    readonly shouldAvoidPermissionPrompts?: boolean;
};
//# sourceMappingURL=permissions.d.ts.map