import picomatch from 'picomatch'
import type { RuleMatcher } from './registry.js'

export class GlobMatcher implements RuleMatcher {
  public readonly toolName = '*'

  matches(ruleContent: string | undefined, input: string | undefined): boolean {
    if (ruleContent === undefined) return true
    if (input === undefined) return false
    try {
      return picomatch(ruleContent)(input)
    } catch {
      return ruleContent === input
    }
  }
}