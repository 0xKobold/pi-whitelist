const DEFAULT_SETTINGS = {
    permissions: {
        allow: [],
        deny: [],
        ask: [],
        denyPaths: [],
        additionalDirectories: [],
    },
};
export function mergeSettings(sources) {
    if (sources.length === 0)
        return structuredClone(DEFAULT_SETTINGS);
    let defaultMode;
    const allowSet = new Set();
    const denySet = new Set();
    const askSet = new Set();
    const denyPathsSet = new Set();
    const dirSet = new Set();
    for (const source of sources) {
        if (source.permissions.defaultMode) {
            defaultMode = source.permissions.defaultMode;
        }
        for (const rule of source.permissions.allow)
            allowSet.add(rule);
        for (const rule of source.permissions.deny)
            denySet.add(rule);
        for (const rule of source.permissions.ask)
            askSet.add(rule);
        for (const path of source.permissions.denyPaths ?? [])
            denyPathsSet.add(path);
        for (const dir of source.permissions.additionalDirectories)
            dirSet.add(dir);
    }
    return {
        permissions: {
            ...(defaultMode ? { defaultMode } : {}),
            allow: [...allowSet],
            deny: [...denySet],
            ask: [...askSet],
            denyPaths: [...denyPathsSet],
            additionalDirectories: [...dirSet],
        },
    };
}
//# sourceMappingURL=merge.js.map