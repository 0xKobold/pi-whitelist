const SHELL_OPERATORS_RE = /(?:&&|\|\||[;|])/g;
function splitShellCommands(command) {
    return command
        .split(SHELL_OPERATORS_RE)
        .map(s => s.trim())
        .filter(s => s.length > 0);
}
export class CommandMatcher {
    toolName = 'Bash';
    matches(ruleContent, input) {
        if (ruleContent === undefined)
            return true;
        if (input === undefined || input === '')
            return false;
        const subCommands = splitShellCommands(input);
        for (const subCommand of subCommands) {
            if (this.matchesSingle(ruleContent, subCommand)) {
                return true;
            }
        }
        return false;
    }
    matchesSingle(pattern, command) {
        if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1).trimEnd();
            return command.startsWith(prefix) && (command.length === prefix.length || command[prefix.length] === ' ');
        }
        return command === pattern || command.startsWith(pattern + ' ');
    }
}
//# sourceMappingURL=command-matcher.js.map