import { describe, it, expect } from 'vitest'
import { checkPermission } from '../src/check.js'

describe('checkPermission', () => {
  it('allows read-only tools by default', () => {
    const decision = checkPermission({ toolName: 'Read' })
    expect(decision.behavior).toBe('allow')
  })

  it('asks for destructive tools by default', () => {
    const decision = checkPermission({ toolName: 'Bash' })
    expect(decision.behavior).toBe('ask')
  })
})