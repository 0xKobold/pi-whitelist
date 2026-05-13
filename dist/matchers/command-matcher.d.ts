import type { RuleMatcher } from './registry.js';
export declare class CommandMatcher implements RuleMatcher {
    readonly toolName = "Bash";
    matches(ruleContent: string | undefined, input: string | undefined): boolean;
    private matchesSingle;
}
//# sourceMappingURL=command-matcher.d.ts.map