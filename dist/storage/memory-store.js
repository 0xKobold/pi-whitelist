const DEFAULT_SETTINGS = {
    permissions: {
        allow: [],
        deny: [],
        ask: [],
        denyPaths: [],
        additionalDirectories: [],
    },
};
export class MemorySettingsStore {
    settings;
    constructor(initial) {
        this.settings = initial ? structuredClone(initial) : structuredClone(DEFAULT_SETTINGS);
    }
    async load() {
        return structuredClone(this.settings);
    }
    async save(settings) {
        this.settings = structuredClone(settings);
    }
}
//# sourceMappingURL=memory-store.js.map