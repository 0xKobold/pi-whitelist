export const READ_ONLY_TOOLS = new Set([
    'Read',
    'FileRead',
    'Glob',
    'Grep',
    'WebFetch',
    'WebSearch',
    'TaskGet',
    'TaskList',
    'TaskOutput',
    'ListMcpResources',
    'ReadMcpResource',
    'ToolSearch',
    'LSP',
    'AskUser',
]);
export function isReadOnly(toolName) {
    return READ_ONLY_TOOLS.has(toolName);
}
//# sourceMappingURL=readonly.js.map