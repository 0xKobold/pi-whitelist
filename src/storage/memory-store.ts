import type { SettingsStore, PermissionSettings } from './interface.js'

const DEFAULT_SETTINGS: PermissionSettings = {
  permissions: {
    allow: [],
    deny: [],
    ask: [],
    denyPaths: [],
    additionalDirectories: [],
  },
}

export class MemorySettingsStore implements SettingsStore {
  private settings: PermissionSettings

  constructor(initial?: PermissionSettings) {
    this.settings = initial ? structuredClone(initial) : structuredClone(DEFAULT_SETTINGS)
  }

  async load(): Promise<PermissionSettings> {
    return structuredClone(this.settings)
  }

  async save(settings: PermissionSettings): Promise<void> {
    this.settings = structuredClone(settings)
  }
}