import picomatch from 'picomatch';
export class GlobMatcher {
    toolName = '*';
    matches(ruleContent, input) {
        if (ruleContent === undefined)
            return true;
        if (input === undefined)
            return false;
        try {
            return picomatch(ruleContent)(input);
        }
        catch {
            return ruleContent === input;
        }
    }
}
//# sourceMappingURL=glob-matcher.js.map