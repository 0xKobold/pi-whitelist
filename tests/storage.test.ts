import { describe, it, expect } from 'vitest'
import { MemorySettingsStore } from '../src/storage/memory-store.js'
import type { PermissionSettings } from '../src/storage/interface.js'

describe('MemorySettingsStore', () => {
  it('creates with default settings', async () => {
    const store = new MemorySettingsStore()
    const settings = await store.load()
    expect(settings.permissions.allow).toEqual([])
    expect(settings.permissions.deny).toEqual([])
    expect(settings.permissions.ask).toEqual([])
  })

  it('creates with initial settings', async () => {
    const settings: PermissionSettings = {
      permissions: {
        allow: ['Bash(git *)', 'Read'],
        deny: ['Bash(rm -rf *)'],
        ask: [],
        additionalDirectories: [],
      },
    }
    const store = new MemorySettingsStore(settings)
    const loaded = await store.load()
    expect(loaded).toEqual(settings)
  })

  it('saves and loads settings', async () => {
    const store = new MemorySettingsStore()
    const settings: PermissionSettings = {
      permissions: {
        allow: ['Bash(git *)'],
        deny: [],
        ask: [],
        additionalDirectories: [],
      },
    }
    await store.save(settings)
    const loaded = await store.load()
    expect(loaded.permissions.allow).toContain('Bash(git *)')
  })

  it('adds rules to existing settings', async () => {
    const store = new MemorySettingsStore()
    await store.save({
      permissions: {
        allow: ['Read'],
        deny: [],
        ask: [],
        additionalDirectories: [],
      },
    })
    const settings = await store.load()
    settings.permissions.allow.push('Glob')
    await store.save(settings)
    const loaded = await store.load()
    expect(loaded.permissions.allow).toContain('Glob')
  })
})