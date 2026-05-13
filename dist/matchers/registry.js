export class MatcherRegistry {
    matchers = new Map();
    defaultMatcher;
    constructor(defaultMatcher) {
        // Imported lazily to avoid circular deps
        this.defaultMatcher = defaultMatcher ?? new GlobMatcher();
    }
    register(matcher) {
        this.matchers.set(matcher.toolName, matcher);
    }
    get(toolName) {
        return this.matchers.get(toolName) ?? this.defaultMatcher;
    }
    has(toolName) {
        return this.matchers.has(toolName);
    }
}
// Forward imports for default matcher
import { GlobMatcher } from './glob-matcher.js';
//# sourceMappingURL=registry.js.map