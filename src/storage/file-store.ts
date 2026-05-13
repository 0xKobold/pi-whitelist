import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { SettingsStore, PermissionSettings } from './interface.js'
import { permissionSettingsSchema } from '../types/schemas.js'
import { StorageError } from '../errors.js'

const DEFAULT_SETTINGS: PermissionSettings = {
  permissions: {
    allow: [],
    deny: [],
    ask: [],
    additionalDirectories: [],
  },
}

export class FileSettingsStore implements SettingsStore {
  private cache: PermissionSettings | null = null

  constructor(private filePath: string = '') {}

  async load(): Promise<PermissionSettings> {
    if (this.cache) return structuredClone(this.cache)
    if (!this.filePath) return structuredClone(DEFAULT_SETTINGS)

    try {
      const raw = await readFile(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      const validated = permissionSettingsSchema.parse(parsed)
      this.cache = validated as PermissionSettings
      return structuredClone(this.cache)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new StorageError(this.filePath, error as Error)
      }
      this.cache = structuredClone(DEFAULT_SETTINGS)
      return structuredClone(this.cache)
    }
  }

  async save(settings: PermissionSettings): Promise<void> {
    const validated = permissionSettingsSchema.parse(settings)
    if (this.filePath) {
      const dir = dirname(this.filePath)
      await mkdir(dir, { recursive: true })
      await writeFile(this.filePath, JSON.stringify(validated, null, 2), 'utf-8')
    }
    this.cache = structuredClone(validated as PermissionSettings)
  }

  invalidateCache(): void {
    this.cache = null
  }
}