import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { permissionSettingsSchema } from '../types/schemas.js';
import { StorageError } from '../errors.js';
const DEFAULT_SETTINGS = {
    permissions: {
        allow: [],
        deny: [],
        ask: [],
        denyPaths: [],
        additionalDirectories: [],
    },
};
export class FileSettingsStore {
    filePath;
    cache = null;
    constructor(filePath = '') {
        this.filePath = filePath;
    }
    async load() {
        if (this.cache)
            return structuredClone(this.cache);
        if (!this.filePath)
            return structuredClone(DEFAULT_SETTINGS);
        try {
            const raw = await readFile(this.filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            const validated = permissionSettingsSchema.parse(parsed);
            this.cache = validated;
            return structuredClone(this.cache);
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new StorageError(this.filePath, error);
            }
            this.cache = structuredClone(DEFAULT_SETTINGS);
            return structuredClone(this.cache);
        }
    }
    async save(settings) {
        const validated = permissionSettingsSchema.parse(settings);
        if (this.filePath) {
            const dir = dirname(this.filePath);
            await mkdir(dir, { recursive: true });
            await writeFile(this.filePath, JSON.stringify(validated, null, 2), 'utf-8');
        }
        this.cache = structuredClone(validated);
    }
    invalidateCache() {
        this.cache = null;
    }
}
//# sourceMappingURL=file-store.js.map