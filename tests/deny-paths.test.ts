import { describe, it, expect } from 'vitest'
import { expandDenyPaths, FILE_TOOLS } from '../src/deny-paths.js'

describe('expandDenyPaths', () => {
  it('expands a single path to deny rules for all file tools', () => {
    const result = expandDenyPaths(['.env*'])
    expect(result).toContain('Read(.env*)')
    expect(result).toContain('Edit(.env*)')
    expect(result).toContain('Write(.env*)')
    expect(result).toContain('read(.env*)')
    expect(result).toContain('edit(.env*)')
    expect(result).toContain('write(.env*)')
    expect(result).toHaveLength(6)
  })

  it('expands multiple paths', () => {
    const result = expandDenyPaths(['.env*', '/etc/*'])
    expect(result).toHaveLength(12) // 6 per path
    expect(result).toContain('Read(.env*)')
    expect(result).toContain('Read(/etc/*)')
  })

  it('returns empty array for empty input', () => {
    expect(expandDenyPaths([])).toEqual([])
  })

  it('handles glob patterns', () => {
    const result = expandDenyPaths(['**/*.secret'])
    expect(result).toContain('Read(**/*.secret)')
    expect(result).toContain('Edit(**/*.secret)')
  })
})

describe('FILE_TOOLS', () => {
  it('includes both PascalCase and lowercase variants', () => {
    expect(FILE_TOOLS).toContain('Read')
    expect(FILE_TOOLS).toContain('read')
    expect(FILE_TOOLS).toContain('Edit')
    expect(FILE_TOOLS).toContain('edit')
    expect(FILE_TOOLS).toContain('Write')
    expect(FILE_TOOLS).toContain('write')
  })
})