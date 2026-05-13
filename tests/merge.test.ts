import { describe, it, expect } from 'vitest'
import { mergeSettings } from '../src/storage/merge.js'
import type { PermissionSettings } from '../src/storage/interface.js'

describe('mergeSettings', () => {
  it('returns single settings source unchanged', () => {
    const settings: PermissionSettings = {
      permissions: {
        allow: ['Bash(git *)'],
        deny: ['Bash(rm -rf *)'],
        ask: [],
        additionalDirectories: [],
      },
    }
    const result = mergeSettings([settings])
    expect(result.permissions.allow).toEqual(['Bash(git *)'])
  })

  it('merges allow rules from multiple sources (deduped)', () => {
    const s1: PermissionSettings = {
      permissions: { allow: ['Read', 'Glob'], deny: [], ask: [], additionalDirectories: [] },
    }
    const s2: PermissionSettings = {
      permissions: { allow: ['Glob', 'Grep'], deny: [], ask: [], additionalDirectories: [] },
    }
    const result = mergeSettings([s1, s2])
    expect(result.permissions.allow).toEqual(['Read', 'Glob', 'Grep'])
  })

  it('merges deny rules from multiple sources', () => {
    const s1: PermissionSettings = {
      permissions: { allow: [], deny: ['Bash(rm *)'], ask: [], additionalDirectories: [] },
    }
    const s2: PermissionSettings = {
      permissions: { allow: [], deny: ['Bash(sudo *)'], ask: [], additionalDirectories: [] },
    }
    const result = mergeSettings([s1, s2])
    expect(result.permissions.deny).toEqual(['Bash(rm *)', 'Bash(sudo *)'])
  })

  it('uses last defaultMode when multiple sources specify it', () => {
    const s1: PermissionSettings = {
      permissions: { defaultMode: 'default', allow: [], deny: [], ask: [], additionalDirectories: [] },
    }
    const s2: PermissionSettings = {
      permissions: { defaultMode: 'plan', allow: [], deny: [], ask: [], additionalDirectories: [] },
    }
    const result = mergeSettings([s1, s2])
    expect(result.permissions.defaultMode).toBe('plan')
  })

  it('merges additionalDirectories (deduped)', () => {
    const s1: PermissionSettings = {
      permissions: { allow: [], deny: [], ask: [], additionalDirectories: ['/a', '/b'] },
    }
    const s2: PermissionSettings = {
      permissions: { allow: [], deny: [], ask: [], additionalDirectories: ['/b', '/c'] },
    }
    const result = mergeSettings([s1, s2])
    expect(result.permissions.additionalDirectories).toEqual(['/a', '/b', '/c'])
  })

  it('returns defaults for empty array', () => {
    const result = mergeSettings([])
    expect(result.permissions.allow).toEqual([])
    expect(result.permissions.deny).toEqual([])
    expect(result.permissions.ask).toEqual([])
  })
})