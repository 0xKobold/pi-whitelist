import type { RuleMatcher } from './registry.js'

const SHELL_OPERATORS_RE = /(?:&&|\|\||[;|])/g

function splitShellCommands(command: string): string[] {
  return command
    .split(SHELL_OPERATORS_RE)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

export class CommandMatcher implements RuleMatcher {
  public readonly toolName = 'Bash'

  matches(ruleContent: string | undefined, input: string | undefined): boolean {
    if (ruleContent === undefined) return true
    if (input === undefined || input === '') return false

    const subCommands = splitShellCommands(input)
    for (const subCommand of subCommands) {
      if (this.matchesSingle(ruleContent, subCommand)) {
        return true
      }
    }
    return false
  }

  private matchesSingle(pattern: string, command: string): boolean {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1).trimEnd()
      return command.startsWith(prefix) && (command.length === prefix.length || command[prefix.length] === ' ')
    }
    return command === pattern || command.startsWith(pattern + ' ')
  }
}