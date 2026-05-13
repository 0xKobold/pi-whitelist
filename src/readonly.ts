export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
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
] as const)

export function isReadOnly(toolName: string): boolean {
  return READ_ONLY_TOOLS.has(toolName)
}