import type { PermissionBehavior, PermissionCheckInput, PermissionDecision, PermissionMode, PermissionRule, PermissionRuleSource, PermissionRuleValue, PermissionUpdate, ToolPermissionContext, WorkingDirectorySource } from './types/index.js';
import type { SettingsStore } from './storage/interface.js';
export interface PermissionManagerOptions {
    store?: SettingsStore;
    mode?: PermissionMode;
    additionalWorkingDirectories?: Map<string, WorkingDirectorySource>;
    isBypassPermissionsModeAvailable?: boolean;
    shouldAvoidPermissionPrompts?: boolean;
}
export declare class PermissionManager {
    private _mode;
    private registry;
    private cache;
    private inMemoryRules;
    private additionalWorkingDirectories;
    private isBypassPermissionsModeAvailable;
    private shouldAvoidPermissionPrompts;
    constructor(options?: PermissionManagerOptions);
    invalidateCache(): void;
    getContext(): ToolPermissionContext;
    check(input: PermissionCheckInput): PermissionDecision;
    private evaluate;
    private findMatchingRule;
    private getRulesByBehavior;
    private buildAllow;
    private buildDeny;
    private buildAsk;
    addRule(rule: PermissionRuleValue, behavior: PermissionBehavior, source: PermissionRuleSource): void;
    removeRule(rule: PermissionRuleValue, behavior: PermissionBehavior, source: PermissionRuleSource): void;
    setMode(mode: PermissionMode): void;
    addDirectory(path: string, source: WorkingDirectorySource): void;
    removeDirectory(path: string): void;
    applyUpdates(updates: PermissionUpdate[]): void;
    private applyUpdate;
    isBashAllowed(command: string): boolean;
    isFileEditAllowed(filePath: string): boolean;
    getRulesForTool(toolName: string): PermissionRule[];
    getRulesFromSource(source: PermissionRuleSource): PermissionRule[];
}
//# sourceMappingURL=manager.d.ts.map