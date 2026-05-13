export type PermissionErrorCode =
  | 'RULE_PARSE_ERROR'
  | 'STORAGE_ERROR'
  | 'MATCHER_ERROR'
  | 'INVALID_TOOL_NAME'
  | 'INVALID_RULE_CONTENT'
  | 'CONFLICTING_RULES'

export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly code: PermissionErrorCode,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}

export class RuleParseError extends PermissionError {
  constructor(ruleString: string, reason: string) {
    super(
      `Failed to parse rule '${ruleString}': ${reason}`,
      'RULE_PARSE_ERROR',
      { ruleString, reason },
    )
    this.name = 'RuleParseError'
  }
}

export class StorageError extends PermissionError {
  constructor(path: string, cause: Error) {
    super(
      `Permission settings error at ${path}: ${cause.message}`,
      'STORAGE_ERROR',
      { path, cause },
    )
    this.name = 'StorageError'
  }
}

export class MatcherError extends PermissionError {
  constructor(toolName: string, pattern: string, cause: Error) {
    super(
      `Matcher error for ${toolName}('${pattern}'): ${cause.message}`,
      'MATCHER_ERROR',
      { toolName, pattern, cause },
    )
    this.name = 'MatcherError'
  }
}