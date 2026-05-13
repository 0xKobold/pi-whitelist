import type { RuleMatcher } from './registry.js';
export declare class GlobMatcher implements RuleMatcher {
    readonly toolName = "*";
    matches(ruleContent: string | undefined, input: string | undefined): boolean;
}
//# sourceMappingURL=glob-matcher.d.ts.map