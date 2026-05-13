export type PermissionErrorCode = 'RULE_PARSE_ERROR' | 'STORAGE_ERROR' | 'MATCHER_ERROR' | 'INVALID_TOOL_NAME' | 'INVALID_RULE_CONTENT' | 'CONFLICTING_RULES';
export declare class PermissionError extends Error {
    readonly code: PermissionErrorCode;
    readonly details?: unknown | undefined;
    constructor(message: string, code: PermissionErrorCode, details?: unknown | undefined);
}
export declare class RuleParseError extends PermissionError {
    constructor(ruleString: string, reason: string);
}
export declare class StorageError extends PermissionError {
    constructor(path: string, cause: Error);
}
export declare class MatcherError extends PermissionError {
    constructor(toolName: string, pattern: string, cause: Error);
}
//# sourceMappingURL=errors.d.ts.map