import type { SettingsStore, PermissionSettings } from './interface.js';
export declare class FileSettingsStore implements SettingsStore {
    private filePath;
    private cache;
    constructor(filePath?: string);
    load(): Promise<PermissionSettings>;
    save(settings: PermissionSettings): Promise<void>;
    invalidateCache(): void;
}
//# sourceMappingURL=file-store.d.ts.map