import type { SettingsStore, PermissionSettings } from './interface.js';
export declare class MemorySettingsStore implements SettingsStore {
    private settings;
    constructor(initial?: PermissionSettings);
    load(): Promise<PermissionSettings>;
    save(settings: PermissionSettings): Promise<void>;
}
//# sourceMappingURL=memory-store.d.ts.map