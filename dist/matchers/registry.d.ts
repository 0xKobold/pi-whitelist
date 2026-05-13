export interface RuleMatcher {
    readonly toolName: string;
    matches(ruleContent: string | undefined, input: string | undefined): boolean;
}
export declare class MatcherRegistry {
    private matchers;
    private defaultMatcher;
    constructor(defaultMatcher?: RuleMatcher);
    register(matcher: RuleMatcher): void;
    get(toolName: string): RuleMatcher;
    has(toolName: string): boolean;
}
//# sourceMappingURL=registry.d.ts.map