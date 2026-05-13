import picomatch from 'picomatch';
function normalizePath(filepath) {
    return filepath
        .replace(/^[A-Za-z]:/, '')
        .replace(/\\/g, '/');
}
export class FileMatcher {
    toolName = 'FileEdit';
    matches(ruleContent, input) {
        if (ruleContent === undefined)
            return true;
        if (input === undefined)
            return false;
        const normalizedInput = normalizePath(input);
        try {
            return picomatch(ruleContent)(normalizedInput);
        }
        catch {
            return ruleContent === normalizedInput;
        }
    }
}
//# sourceMappingURL=file-matcher.js.map