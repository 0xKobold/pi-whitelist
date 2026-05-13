export interface RuleMatcher {
  readonly toolName: string
  matches(ruleContent: string | undefined, input: string | undefined): boolean
}

export class MatcherRegistry {
  private matchers = new Map<string, RuleMatcher>()
  private defaultMatcher: RuleMatcher

  constructor(defaultMatcher?: RuleMatcher) {
    // Imported lazily to avoid circular deps
    this.defaultMatcher = defaultMatcher ?? new GlobMatcher()
  }

  register(matcher: RuleMatcher): void {
    this.matchers.set(matcher.toolName, matcher)
  }

  get(toolName: string): RuleMatcher {
    return this.matchers.get(toolName) ?? this.defaultMatcher
  }

  has(toolName: string): boolean {
    return this.matchers.has(toolName)
  }
}

// Forward imports for default matcher
import { GlobMatcher } from './glob-matcher.js'