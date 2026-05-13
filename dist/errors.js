export class PermissionError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'PermissionError';
    }
}
export class RuleParseError extends PermissionError {
    constructor(ruleString, reason) {
        super(`Failed to parse rule '${ruleString}': ${reason}`, 'RULE_PARSE_ERROR', { ruleString, reason });
        this.name = 'RuleParseError';
    }
}
export class StorageError extends PermissionError {
    constructor(path, cause) {
        super(`Permission settings error at ${path}: ${cause.message}`, 'STORAGE_ERROR', { path, cause });
        this.name = 'StorageError';
    }
}
export class MatcherError extends PermissionError {
    constructor(toolName, pattern, cause) {
        super(`Matcher error for ${toolName}('${pattern}'): ${cause.message}`, 'MATCHER_ERROR', { toolName, pattern, cause });
        this.name = 'MatcherError';
    }
}
//# sourceMappingURL=errors.js.map