import picomatch from 'picomatch'
import type { RuleMatcher } from './registry.js'

function normalizePath(filepath: string): string {
  return filepath
    .replace(/^[A-Za-z]:/, '')
    .replace(/\\/g, '/')
}

export class FileMatcher implements RuleMatcher {
  public readonly toolName = 'FileEdit'

  matches(ruleContent: string | undefined, input: string | undefined): boolean {
    if (ruleContent === undefined) return true
    if (input === undefined) return false

    const normalizedInput = normalizePath(input)
    try {
      return picomatch(ruleContent)(normalizedInput)
    } catch {
      return ruleContent === normalizedInput
    }
  }
}