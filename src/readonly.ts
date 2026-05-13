export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  // PascalCase (canonical)
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
  // lowercase (pi agent internal names)
  'read',
  'fileread',
  'glob',
  'grep',
  'webfetch',
  'websearch',
  'taskget',
  'tasklist',
  'taskoutput',
  'listmcpresources',
  'readmcpresource',
  'toolsearch',
  'lsp',
  'askuser',
] as const)

export function isReadOnly(toolName: string): boolean {
  return READ_ONLY_TOOLS.has(toolName) || READ_ONLY_TOOLS.has(toolName.charAt(0).toUpperCase() + toolName.slice(1))
}