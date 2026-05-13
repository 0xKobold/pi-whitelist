import type { PermissionSettings } from './interface.js'

const DEFAULT_SETTINGS: PermissionSettings = {
  permissions: {
    allow: [],
    deny: [],
    ask: [],
    additionalDirectories: [],
  },
}

export function mergeSettings(sources: PermissionSettings[]): PermissionSettings {
  if (sources.length === 0) return structuredClone(DEFAULT_SETTINGS)

  let defaultMode: string | undefined
  const allowSet = new Set<string>()
  const denySet = new Set<string>()
  const askSet = new Set<string>()
  const dirSet = new Set<string>()

  for (const source of sources) {
    if (source.permissions.defaultMode) {
      defaultMode = source.permissions.defaultMode
    }
    for (const rule of source.permissions.allow) allowSet.add(rule)
    for (const rule of source.permissions.deny) denySet.add(rule)
    for (const rule of source.permissions.ask) askSet.add(rule)
    for (const dir of source.permissions.additionalDirectories) dirSet.add(dir)
  }

  return {
    permissions: {
      ...(defaultMode ? { defaultMode } : {}),
      allow: [...allowSet],
      deny: [...denySet],
      ask: [...askSet],
      additionalDirectories: [...dirSet],
    },
  }
}