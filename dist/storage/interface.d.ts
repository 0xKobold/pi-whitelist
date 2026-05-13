export interface PermissionSettings {
    permissions: {
        defaultMode?: string;
        allow: string[];
        deny: string[];
        ask: string[];
        additionalDirectories: string[];
    };
}
export interface SettingsStore {
    load(): Promise<PermissionSettings>;
    save(settings: PermissionSettings): Promise<void>;
    watch?(onChange: () => void): () => void;
}
//# sourceMappingURL=interface.d.ts.map