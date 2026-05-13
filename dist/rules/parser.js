function findFirstUnescapedChar(str, char) {
    for (let i = 0; i < str.length; i++) {
        if (str[i] === char) {
            let backslashCount = 0;
            let j = i - 1;
            while (j >= 0 && str[j] === '\\') {
                backslashCount++;
                j--;
            }
            if (backslashCount % 2 === 0)
                return i;
        }
    }
    return -1;
}
function findLastUnescapedChar(str, char) {
    for (let i = str.length - 1; i >= 0; i--) {
        if (str[i] === char) {
            let backslashCount = 0;
            let j = i - 1;
            while (j >= 0 && str[j] === '\\') {
                backslashCount++;
                j--;
            }
            if (backslashCount % 2 === 0)
                return i;
        }
    }
    return -1;
}
export function escapeRuleContent(content) {
    return content
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}
export function unescapeRuleContent(content) {
    return content
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
}
export function parseRuleString(ruleString) {
    const openParenIndex = findFirstUnescapedChar(ruleString, '(');
    if (openParenIndex === -1) {
        return { toolName: ruleString };
    }
    const closeParenIndex = findLastUnescapedChar(ruleString, ')');
    if (closeParenIndex === -1 || closeParenIndex < openParenIndex) {
        return { toolName: ruleString };
    }
    const toolName = ruleString.slice(0, openParenIndex);
    const rawContent = ruleString.slice(openParenIndex + 1, closeParenIndex);
    const ruleContent = unescapeRuleContent(rawContent);
    return { toolName, ruleContent };
}
export function serializeRuleString(value) {
    if (value.ruleContent === undefined) {
        return value.toolName;
    }
    const escapedContent = escapeRuleContent(value.ruleContent);
    return `${value.toolName}(${escapedContent})`;
}
//# sourceMappingURL=parser.js.map