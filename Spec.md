# pi-whitelist — Tool Permission System for pi-coding-agent

## 1. Overview

### 1.1 Purpose

`pi-whitelist` provides a centralized tool permission system for pi-coding-agent — controlling which tools an AI agent can invoke, and whether each invocation requires explicit user approval. It mirrors the tri-state permission model from Claude Code: **Allow** (once), **Always Allow** (persist rule), and **Deny** — wrapped as a standalone npm package that any pi agent or extension can integrate.

### 1.2 Target Users

- **pi-coding-agent core** — the main agent loop that dispatches tool calls
- **pi extensions** — extensions that add custom tools needing permission gating
- **pi skill authors** — skill developers who need to declare what their skills access
- **pi users** — anyone running pi who wants fine-grained control over agent behavior

### 1.3 Out of Scope (v1)

- **ML-based auto-approval classifier** — Claude Code's `auto` mode; too complex for v1
- **IDE bridge permission proxy** — Claude Code routes permissions to VS Code/JetBrains; pi has no IDE equivalent yet
- **Hook-based permission interception** — Claude Code's `executePermissionRequestHooks`; v1 is direct check only
- **Multi-agent coordinator permissions** — team/sub-agent permission routing
- **Permission request UI rendering** — this package provides the *decision*, not the UI. The agent's TUI handles rendering.

### 1.4 Design Principles

| Principle | Guideline |
|---|---|
| Zero-config defaults | Read-only tools auto-allow; destructive tools require approval |
| Rule-based, not ACL-based | Wildcard patterns like `Bash(git *)`, not role/principal mappings |
| Persistent across sessions | "Always allow" writes to settings files that survive restarts |
| Three-way decision | Every check returns allow, deny, or ask — no boolean shortcuts |
| Source-aware | Rules track origin (user settings, project settings, CLI override, session) so users can audit where a rule came from |
| Runtime-agnostic | Works in Node, Bun, or any JS runtime. No DOM, no fs watcher. |

---

## 2. Package

### 2.1 Installation

```bash
npm install @0xkobold/pi-whitelist
# or
bun add @0xkobold/pi-whitelist
```

### 2.2 Exports

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./rules": "./dist/rules/index.js",
    "./matchers": "./dist/matchers/index.js",
    "./storage": "./dist/storage/index.js",
    "./types": "./dist/types/index.js"
  }
}
```

### 2.3 Module Format

ESM only. TypeScript source with strict mode. Node 18+ / Bun 1.0+.

### 2.4 Exported Symbols

| Symbol | Section | Description |
|---|---|---|
| `PermissionManager` | 3 | Main class — check, add, remove rules |
| `checkPermission` | 3 | Standalone function for one-shot checks |
| `PermissionBehavior` | 4 | `'allow' \| 'deny' \| 'ask'` enum |
| `PermissionMode` | 4 | `'default' \| 'acceptEdits' \| 'bypassPermissions' \| 'plan'` |
| `PermissionRule` | 4 | Rule with source, behavior, value |
| `PermissionRuleValue` | 4 | `{ toolName, ruleContent? }` |
| `PermissionDecision` | 4 | Allow/Ask/Deny result types |
| `PermissionUpdate` | 4 | Add/replace/remove rules mutations |
| `RuleMatcher` | 5 | Interface for custom matching strategies |
| `GlobMatcher` | 5 | Default glob-based content matcher |
| `CommandMatcher` | 5 | Shell command prefix matcher for Bash |
| `FileMatcher` | 5 | File path matcher for FileEdit/FileWrite |
| `SettingsStore` | 6 | Interface for storage backends |
| `FileSettingsStore` | 6 | JSON file-based storage implementation |
| `MemorySettingsStore` | 6 | In-memory-only storage for tests |
| `parseRuleString` | 5 | `'Bash(git *)'` → `{ toolName: 'Bash', ruleContent: 'git *' }` |
| `serializeRuleString` | 5 | Reverse of `parseRuleString` |
| `escapeRuleContent` | 5 | Escape parentheses in rule content |
| `unescapeRuleContent` | 5 | Unescape parentheses in rule content |

---

## 3. Client API

### 3.1 PermissionManager

The primary entry point. Holds rule sets, resolves checks, persists changes.

```typescript
import { PermissionManager, FileSettingsStore } from '@0xkobold/pi-whitelist'

const manager = new PermissionManager({
  store: new FileSettingsStore(),
  mode: 'default',
})

// Check if a tool invocation is allowed
const decision = manager.check({
  toolName: 'Bash',
  ruleContent: 'git commit -m "fix typo"',
})

// decision.behavior === 'allow' | 'deny' | 'ask'
// decision.decisionReason tells you WHY
```

#### Constructor Options

```typescript
interface PermissionManagerOptions {
  /** Storage backend. Defaults to MemorySettingsStore. */
  store?: SettingsStore
  /** Current permission mode. Defaults to 'default'. */
  mode?: PermissionMode
  /** Additional working directories for path-based rules. */
  additionalWorkingDirectories?: Map<string, WorkingDirectorySource>
  /** Whether bypassPermissions mode is available (e.g., from CLI flag). */
  isBypassPermissionsModeAvailable?: boolean
  /** Whether to avoid showing permission prompts (e.g., non-interactive). */
  shouldAvoidPermissionPrompts?: boolean
}
```

#### Methods

##### `check(input: PermissionCheckInput): PermissionDecision`

Evaluates a tool invocation against all rules. Returns the final decision.

```typescript
interface PermissionCheckInput {
  toolName: string
  ruleContent?: string  // e.g., 'git commit' for Bash, '/src/**/*.ts' for FileEdit
  workingDirectory?: string  // for path-scoped rules
}

// Returns one of:
// PermissionAllowDecision — { behavior: 'allow', decisionReason, updatedInput? }
// PermissionAskDecision   — { behavior: 'ask', message, suggestions? }
// PermissionDenyDecision   — { behavior: 'deny', message, decisionReason }
```

**Evaluation order:**
1. If `mode === 'bypassPermissions'` → always allow (with reason `{ type: 'mode', mode: 'bypassPermissions' }`)
2. Check `alwaysDenyRules` — if any match → deny
3. Check `alwaysAllowRules` — if any match → allow
4. Check `alwaysAskRules` — if any match → ask
5. If tool is classified as read-only → allow
6. Default → ask (the tool needs user approval)

##### `addRule(rule: PermissionRuleValue, behavior: PermissionBehavior, source: PermissionRuleSource): void`

Adds a rule and persists it via the store.

##### `removeRule(rule: PermissionRuleValue, behavior: PermissionBehavior, source: PermissionRuleSource): void`

Removes a matching rule. No-op if not found.

##### `addDirectory(path: string, source: WorkingDirectorySource): void`

Adds a working directory scope for path-based rules.

##### `removeDirectory(path: string): void`

Removes a working directory scope.

##### `setMode(mode: PermissionMode): void`

Switches the active permission mode. Persists if store supports it.

##### `getContext(): ToolPermissionContext`

Returns the current full context snapshot (for logging, debugging, serialization).

##### `applyUpdates(updates: PermissionUpdate[]): void`

Applies a batch of permission updates atomically. Used for "always allow" decisions that need to persist multiple rule changes.

---

### 3.2 Standalone `checkPermission`

For one-shot checks without instantiating a manager. Uses default settings.

```typescript
import { checkPermission } from '@0xkobold/pi-whitelist'

const decision = checkPermission({
  toolName: 'Bash',
  ruleContent: 'npm test',
})
```

---

### 3.3 Convenience Methods

```typescript
// Check if a Bash command is allowlisted
manager.isBashAllowed('git status')  // true if any Bash rule matches

// Check if a file path is allowed for editing
manager.isFileEditAllowed('/src/index.ts')  // true if any FileEdit rule matches

// Get all rules for a specific tool
manager.getRulesForTool('Bash')  // PermissionRule[]

// Get all rules from a specific source
manager.getRulesFromSource('userSettings')  // PermissionRule[]
```

---

## 4. Zod Schemas / Types

### 4.1 Core Types

```typescript
// === Permission Behaviors ===
export type PermissionBehavior = 'allow' | 'deny' | 'ask'

// === Permission Modes ===
export const EXTERNAL_PERMISSION_MODES = [
  'acceptEdits',
  'bypassPermissions',
  'default',
  'dontAsk',
  'plan',
] as const
export type ExternalPermissionMode = (typeof EXTERNAL_PERMISSION_MODES)[number]
export type InternalPermissionMode = ExternalPermissionMode | 'auto'
export type PermissionMode = InternalPermissionMode

// === Rule Sources ===
export type PermissionRuleSource =
  | 'userSettings'     // ~/.pi/settings.json
  | 'projectSettings'  // .pi/settings.json
  | 'localSettings'    // .pi/settings.local.json
  | 'flagSettings'     // CLI flags (--allowedTools, --deniedTools)
  | 'policySettings'   // Enterprise/org policy
  | 'cliArg'           // One-off CLI argument
  | 'command'          // /command in session
  | 'session'          // In-memory for this session only

// === Rule Value ===
export type PermissionRuleValue = {
  toolName: string
  ruleContent?: string  // Optional content pattern (e.g., 'git *' for Bash)
}

// === Rule ===
export type PermissionRule = {
  source: PermissionRuleSource
  ruleBehavior: PermissionBehavior
  ruleValue: PermissionRuleValue
}

// === Permission Decisions ===
export type PermissionAllowDecision = {
  behavior: 'allow'
  updatedInput?: PermissionCheckInput
  userModified?: boolean
  decisionReason: PermissionDecisionReason
}

export type PermissionAskDecision = {
  behavior: 'ask'
  message: string
  updatedInput?: PermissionCheckInput
  decisionReason?: PermissionDecisionReason
  suggestions?: PermissionUpdate[]
  blockedPath?: string
}

export type PermissionDenyDecision = {
  behavior: 'deny'
  message: string
  decisionReason: PermissionDecisionReason
}

export type PermissionDecision =
  | PermissionAllowDecision
  | PermissionAskDecision
  | PermissionDenyDecision

// === Decision Reasons ===
export type PermissionDecisionReason =
  | { type: 'rule'; rule: PermissionRule }
  | { type: 'mode'; mode: PermissionMode }
  | { type: 'subcommandResults'; reasons: Map<string, PermissionDecisionReason> }
  | { type: 'workingDir'; reason: string }
  | { type: 'safetyCheck'; reason: string }
  | { type: 'other'; reason: string }

// === Updates ===
export type PermissionUpdateDestination =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'session'
  | 'cliArg'

export type PermissionUpdate =
  | { type: 'addRules'; destination: PermissionUpdateDestination; rules: PermissionRuleValue[]; behavior: PermissionBehavior }
  | { type: 'replaceRules'; destination: PermissionUpdateDestination; rules: PermissionRuleValue[]; behavior: PermissionBehavior }
  | { type: 'removeRules'; destination: PermissionUpdateDestination; rules: PermissionRuleValue[]; behavior: PermissionBehavior }
  | { type: 'setMode'; destination: PermissionUpdateDestination; mode: ExternalPermissionMode }
  | { type: 'addDirectories'; destination: PermissionUpdateDestination; directories: string[] }
  | { type: 'removeDirectories'; destination: PermissionUpdateDestination; directories: string[] }

// === Permission Context ===
export type ToolPermissionContext = {
  readonly mode: PermissionMode
  readonly additionalWorkingDirectories: ReadonlyMap<string, { path: string; source: WorkingDirectorySource }>
  readonly alwaysAllowRules: Record<PermissionRuleSource, string[]>
  readonly alwaysDenyRules: Record<PermissionRuleSource, string[]>
  readonly alwaysAskRules: Record<PermissionRuleSource, string[]>
  readonly isBypassPermissionsModeAvailable: boolean
  readonly shouldAvoidPermissionPrompts?: boolean
}
```

### 4.2 Zod Schemas

```typescript
import { z } from 'zod'

export const permissionBehaviorSchema = z.enum(['allow', 'deny', 'ask'])

export const permissionRuleValueSchema = z.object({
  toolName: z.string().min(1),
  ruleContent: z.string().optional(),
})

export const permissionRuleSchema = z.object({
  source: z.enum([
    'userSettings', 'projectSettings', 'localSettings',
    'flagSettings', 'policySettings', 'cliArg', 'command', 'session',
  ]),
  ruleBehavior: permissionBehaviorSchema,
  ruleValue: permissionRuleValueSchema,
})

export const permissionModeSchema = z.enum([
  'acceptEdits', 'bypassPermissions', 'default', 'dontAsk', 'plan',
])

export const permissionUpdateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('addRules'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    rules: z.array(permissionRuleValueSchema),
    behavior: permissionBehaviorSchema,
  }),
  z.object({
    type: z.literal('replaceRules'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    rules: z.array(permissionRuleValueSchema),
    behavior: permissionBehaviorSchema,
  }),
  z.object({
    type: z.literal('removeRules'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    rules: z.array(permissionRuleValueSchema),
    behavior: permissionBehaviorSchema,
  }),
  z.object({
    type: z.literal('setMode'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    mode: permissionModeSchema,
  }),
  z.object({
    type: z.literal('addDirectories'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    directories: z.array(z.string()),
  }),
  z.object({
    type: z.literal('removeDirectories'),
    destination: z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
    directories: z.array(z.string()),
  }),
])
```

---

## 5. Rule Matchers

### 5.1 Rule String Format

Rules are stored as strings: `ToolName` or `ToolName(content)`. Content may contain escaped parentheses `\(` and `\)`.

```
Bash                → matches any Bash invocation
Bash(git *)         → matches Bash invocations where the command starts with "git "
Bash(npm test)      → matches "npm test" exactly
FileEdit(/src/**)   → matches file edits to anything under /src/
FileRead(*)          → matches reading any file
Read                → matches the Read tool (no content filter)
```

### 5.2 Parsing & Serialization

```typescript
function parseRuleString(rule: string): PermissionRuleValue
// 'Bash(git *)'       → { toolName: 'Bash', ruleContent: 'git *' }
// 'Bash'              → { toolName: 'Bash' }
// 'Bash(python -c "print\\(1\\)")'
//                     → { toolName: 'Bash', ruleContent: 'python -c "print(1)"' }

function serializeRuleString(value: PermissionRuleValue): string
// { toolName: 'Bash', ruleContent: 'git *' } → 'Bash(git *)'
// { toolName: 'Bash' }                        → 'Bash'

function escapeRuleContent(content: string): string
function unescapeRuleContent(content: string): string
```

### 5.3 Matcher Interface

```typescript
interface RuleMatcher {
  /** The tool name this matcher handles */
  toolName: string

  /** Check if a tool invocation matches a rule's content pattern */
  matches(ruleContent: string | undefined, input: string | undefined): boolean
}
```

### 5.4 Built-in Matchers

#### GlobMatcher (default)

Used when no tool-specific matcher is registered. Uses `picomatch` for glob matching.

```
ruleContent='/src/**'  input='/src/index.ts'    → true
ruleContent='/src/**'  input='/lib/index.ts'    → false
ruleContent='*'        input='anything'          → true
ruleContent=undefined  input='anything'          → true (matches all)
```

#### CommandMatcher (for Bash/PowerShell)

Matches shell commands by prefix. Splits on `&&`, `||`, `;`, `|` and checks each sub-command.

```
ruleContent='git *'   input='git commit -m "fix"'  → true
ruleContent='npm'     input='npm test'             → true
ruleContent='npm'     input='npm run build'         → true
ruleContent='rm *'    input='rm -rf /tmp/foo'      → true
ruleContent='rm *'    input='echo hello'             → false
```

**Command splitting logic:**
1. Split the input command on shell operators: `&&`, `||`, `;`, `|`
2. Strip leading/trailing whitespace from each sub-command
3. For each sub-command, check if it starts with the rule content pattern
4. If the rule pattern ends with `*`, match by prefix; otherwise match exactly

#### FileMatcher (for FileEdit, FileWrite, FileRead)

Matches file paths using glob patterns. Paths are normalized to POSIX format.

```
ruleContent='/src/**'     input='/src/index.ts'     → true
ruleContent='/src/**'     input='/lib/index.ts'     → false
ruleContent='*.ts'       input='/src/index.ts'       → true
ruleContent='*.config.*'  input='tsconfig.json'       → false
```

### 5.5 Read-Only Tool Classification

Tools are classified as read-only or destructive. Read-only tools in default mode are automatically allowed without prompting.

```typescript
const READ_ONLY_TOOLS = new Set([
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
```

---

## 6. Storage

### 6.1 Storage Interface

```typescript
interface SettingsStore {
  /** Load all settings from persistence */
  load(): Promise<PermissionSettings>

  /** Save settings to persistence */
  save(settings: PermissionSettings): Promise<void>

  /** Watch for external changes (optional) */
  watch?(onChange: () => void): () => void
}

interface PermissionSettings {
  permissions: {
    defaultMode?: ExternalPermissionMode
    allow: string[]      // Serialized rule strings: ['Bash(git *)', 'Read']
    deny: string[]       // Serialized rule strings: ['Bash(rm *)']
    ask: string[]        // Forced-ask rules
    additionalDirectories: string[]
  }
}
```

### 6.2 FileSettingsStore

Reads/writes JSON files at standard locations:

| Source | File | Priority |
|---|---|---|
| `userSettings` | `~/.pi/settings.json` | Lowest (global defaults) |
| `projectSettings` | `.pi/settings.json` | Medium (project-level) |
| `localSettings` | `.pi/settings.local.json` | High (local overrides, gitignored) |
| `flagSettings` | In-memory from CLI args | Higher |
| `policySettings` | In-memory from org policy | Higher |
| `cliArg` | In-memory from `--allowedTools` | Higher |
| `command` | In-memory from `/command` | Higher |
| `session` | In-memory only | Highest |

**Merge order**: Later sources override earlier for the same rule. Rules from different sources coexist — a `deny` from `policySettings` is checked even if an `allow` exists in `session`.

### 6.3 MemorySettingsStore

In-memory only. Used for testing and ephemeral sessions.

```typescript
const store = new MemorySettingsStore({
  permissions: {
    allow: ['Bash(git *)', 'Read'],
    deny: ['Bash(rm -rf *)'],
    ask: [],
    additionalDirectories: [],
  }
})
```

### 6.4 Settings File Format

`.pi/settings.json`:
```json
{
  "permissions": {
    "defaultMode": "default",
    "allow": [
      "Bash(git *)",
      "Bash(npm test)",
      "Read",
      "FileRead",
      "Glob",
      "Grep"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(curl *|*sudo*)"
    ],
    "ask": [
      "Bash(npm *)"
    ],
    "additionalDirectories": []
  }
}
```

---

## 7. Constants

### 7.1 Read-Only Tools

```typescript
export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  'Read', 'FileRead', 'Glob', 'Grep', 'WebFetch', 'WebSearch',
  'TaskGet', 'TaskList', 'TaskOutput', 'ListMcpResources',
  'ReadMcpResource', 'ToolSearch', 'LSP', 'AskUser',
])
```

### 7.2 Dangerous Tool Patterns

```typescript
export const DANGEROUS_PATTERNS: readonly PermissionRuleValue[] = [
  { toolName: 'Bash', ruleContent: 'rm -rf *' },
  { toolName: 'Bash', ruleContent: 'rm -rf /' },
  { toolName: 'Bash', ruleContent: 'sudo *' },
  { toolName: 'Bash', ruleContent: 'chmod 777 *' },
  { toolName: 'Bash', ruleContent: ':(){ :|:& };:' },  // fork bomb
  { toolName: 'FileWrite', ruleContent: '/etc/*' },
  { toolName: 'FileWrite', ruleContent: '/usr/*' },
  { toolName: 'FileWrite', ruleContent: '/System/*' },
]
```

### 7.3 Default Allow Rules

```typescript
export const DEFAULT_ALLOW_RULES: readonly string[] = [
  'Read',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
]
```

---

## 8. Error Handling

### 8.1 Error Class Hierarchy

```typescript
export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly code: PermissionErrorCode,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}

export class RuleParseError extends PermissionError {
  constructor(ruleString: string, reason: string) {
    super(`Failed to parse rule '${ruleString}': ${reason}`, 'RULE_PARSE_ERROR', { ruleString, reason })
  }
}

export class StorageError extends PermissionError {
  constructor(path: string, cause: Error) {
    super(`Permission settings error at ${path}: ${cause.message}`, 'STORAGE_ERROR', { path, cause })
  }
}

export class MatcherError extends PermissionError {
  constructor(toolName: string, pattern: string, cause: Error) {
    super(`Matcher error for ${toolName}('${pattern}'): ${cause.message}`, 'MATCHER_ERROR', { toolName, pattern, cause })
  }
}

export type PermissionErrorCode =
  | 'RULE_PARSE_ERROR'      // Malformed rule string
  | 'STORAGE_ERROR'          // File read/write failure
  | 'MATCHER_ERROR'          // Glob/command matching failure
  | 'INVALID_TOOL_NAME'      // Empty or malformed tool name
  | 'INVALID_RULE_CONTENT'   // Pattern that can't be compiled
  | 'CONFLICTING_RULES'       // Same rule in both allow and deny
```

### 8.2 Behavior Table

| Scenario | Behavior |
|---|---|
| Malformed rule string in settings | Log warning, skip rule, continue |
| Settings file not found | Create with defaults, continue |
| Settings file has invalid JSON | Throw `StorageError` on load |
| Tool name not found in any rule | Check read-only classification, else `ask` |
| Same rule exists in both allow and deny | Deny takes precedence |
| Storage write fails (permissions) | Log error, rule still applies in memory |
| Glob pattern compilation fails | Treat as literal string match, log warning |
| Empty `ruleContent` with `undefined` input | Match (rule applies to all invocations of tool) |

---

## 9. Caching

Rule evaluation results are cached in-memory for the lifetime of the `PermissionManager` instance.

### 9.1 Cache Keys

```
cache key = `${toolName}:${ruleContent ?? '*'}:${input ?? '*'}`
```

### 9.2 Cache Invalidation

- **On rule add/remove** — invalidate all entries for the affected tool
- **On mode change** — invalidate entire cache
- **On settings file change** — invalidate entire cache (via watch callback)

### 9.3 TTL

No TTL. Rules change infrequently. Invalidate on mutation.

---

## 10. Rate Limiting

Not applicable. This is a local permission check, not an API.

---

## 11. Testing Strategy

### 11.1 Unit Tests

| Suite | Coverage Target | Key Scenarios |
|---|---|---|
| `parseRuleString` | 100% | Tool-only, tool+content, escaped parens, unicode, empty |
| `serializeRuleString` | 100% | Roundtrip with parse, special chars |
| `escapeRuleContent` / `unescapeRuleContent` | 100% | Parentheses, backslashes, mixed |
| `GlobMatcher` | 95% | Wildcards, recursive globs, exact matches, edge cases |
| `CommandMatcher` | 95% | Prefix matching, compound commands (`&&`, `||`, `;`), pipes, nested |
| `FileMatcher` | 95% | Absolute/relative paths, Windows paths (normalized), `*` vs `**` |
| `PermissionManager.check` | 95% | All mode overrides, rule precedence, deny-first, read-only bypass |
| `PermissionManager.addRule` / `removeRule` | 100% | Add, remove, no-op on missing |
| `applyUpdates` | 95% | All 6 update types, atomic multi-update |
| `FileSettingsStore` | 90% | Load/save/merge, missing file, invalid JSON, permission errors |
| `MemorySettingsStore` | 100% | Basic CRUD |
| Rule source precedence | 90% | session > command > cliArg > policy > flag > project > user |

### 11.2 Integration Tests

| Test | Description |
|---|---|
| End-to-end check flow | Create manager → add rules → check various inputs → verify decisions |
| Settings round-trip | Write rules → persist → reload → verify rules intact |
| Multi-source merge | User allow + project deny = deny; project allow + session deny = deny |
| Mode override | `bypassPermissions` skips all checks; `plan` mode forces ask |
| CLI flag override | `--allowedTools "Bash(git *)"` → immediate allow without prompting |

### 11.3 Fixtures

| File | Description |
|---|---|
| `fixtures/user-settings.json` | Typical user settings with allow/deny rules |
| `fixtures/project-settings.json` | Project-level settings |
| `fixtures/complex-rules.json` | Many rules exercising all matcher types |
| `fixtures/conflicting-rules.json` | Same rule in allow and deny to test precedence |

---

## 12. Project Structure

```
pi-whitelist/
├── src/
│   ├── index.ts                    # Re-exports from all modules
│   ├── types/
│   │   ├── index.ts                # Re-exports
│   │   ├── permissions.ts          # All TypeScript types
│   │   └── schemas.ts              # Zod schemas
│   ├── manager.ts                  # PermissionManager class
│   ├── check.ts                    # Standalone checkPermission function
│   ├── rules/
│   │   ├── index.ts                # Re-exports
│   │   ├── parser.ts               # parseRuleString, serializeRuleString, escape/unesc
│   │   ├── matcher.ts              # RuleMatcher interface
│   │   ├── glob-matcher.ts         # GlobMatcher (picomatch-based)
│   │   ├── command-matcher.ts      # CommandMatcher (shell splitting)
│   │   ├── file-matcher.ts         # FileMatcher (path glob)
│   │   └── registry.ts            # MatcherRegistry — tool name → matcher
│   ├── storage/
│   │   ├── index.ts                # Re-exports
│   │   ├── interface.ts            # SettingsStore interface
│   │   ├── file-store.ts           # FileSettingsStore
│   │   ├── memory-store.ts         # MemorySettingsStore
│   │   └── merge.ts                # Multi-source merge logic
│   ├── readonly.ts                 # READ_ONLY_TOOLS, isReadOnly()
│   ├── dangerous.ts                # DANGEROUS_PATTERNS
│   ├── constants.ts                # DEFAULT_ALLOW_RULES, source precedence
│   └── errors.ts                   # PermissionError, RuleParseError, etc.
├── tests/
│   ├── parser.test.ts
│   ├── matcher.test.ts
│   ├── manager.test.ts
│   ├── check.test.ts
│   ├── storage.test.ts
│   ├── merge.test.ts
│   ├── readonly.test.ts
│   └── fixtures/
│       ├── user-settings.json
│       ├── project-settings.json
│       ├── complex-rules.json
│       └── conflicting-rules.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── Spec.md                         # This file
└── SKILL.md                        # Agent skill description
```

---

## 13. Usage Examples

### 13.1 Basic Permission Check

```typescript
import { PermissionManager, MemorySettingsStore } from '@0xkobold/pi-whitelist'

const manager = new PermissionManager({
  store: new MemorySettingsStore({
    permissions: {
      allow: ['Bash(git *)', 'Read'],
      deny: ['Bash(rm -rf *)'],
      ask: [],
      additionalDirectories: [],
    },
  }),
})

// Git commands are allowlisted → allow
manager.check({ toolName: 'Bash', ruleContent: 'git status' })
// → { behavior: 'allow', decisionReason: { type: 'rule', rule: ... } }

// Dangerous command → deny
manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /tmp' })
// → { behavior: 'deny', message: '...', decisionReason: { type: 'rule', rule: ... } }

// Unknown tool → ask (needs user approval)
manager.check({ toolName: 'Bash', ruleContent: 'docker build .' })
// → { behavior: 'ask', message: 'Bash: docker build .', suggestions: [...] }
```

### 13.2 "Always Allow" — Persisting a Rule

When a user selects option 2 (always allow), the rule is persisted:

```typescript
// User answered "2 — always allow" for Bash(docker *)
manager.addRule(
  { toolName: 'Bash', ruleContent: 'docker *' },
  'allow',
  'userSettings',  // persists to ~/.pi/settings.json
)

// Next invocation is automatically allowed
manager.check({ toolName: 'Bash', ruleContent: 'docker build .' })
// → { behavior: 'allow', ... }
```

### 13.3 Three-State UI Integration

```typescript
// Agent TUI shows a permission prompt:
// ┌─────────────────────────────────────────────┐
// │  Bash: docker build -t myapp .               │
// │                                               │
// │  1. Allow          (allow this once)          │
// │  2. Allow always   (add rule to settings)     │
// │  3. Deny           (block this invocation)    │
// └─────────────────────────────────────────────┘

const decision = manager.check({ toolName: 'Bash', ruleContent: 'docker build -t myapp .' })

if (decision.behavior === 'ask') {
  // Show the prompt to the user
  const userChoice = await showPermissionPrompt(decision)

  if (userChoice === 1) {
    // Allow once — don't persist
    return { behavior: 'allow', decisionReason: { type: 'other', reason: 'user-allow-once' } }
  }
  if (userChoice === 2) {
    // Allow always — persist the rule
    manager.addRule(
      { toolName: 'Bash', ruleContent: 'docker *' },
      'allow',
      'projectSettings',
    )
    return { behavior: 'allow', decisionReason: { type: 'rule', rule: ... } }
  }
  if (userChoice === 3) {
    // Deny
    return { behavior: 'deny', message: decision.message, decisionReason: ... }
  }
}
```

### 13.4 Project-Level Settings

```json
// .pi/settings.json
{
  "permissions": {
    "defaultMode": "default",
    "allow": [
      "Bash(npm *)",
      "Bash(git *)",
      "Bash(bun *)",
      "Bash(npx *)",
      "FileEdit(/src/**)",
      "FileWrite(/src/**)",
      "Read"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo *)",
      "FileWrite(/etc/*)",
      "FileWrite(/usr/*)"
    ],
    "ask": [],
    "additionalDirectories": []
  }
}
```

### 13.5 Mode Overrides

```typescript
// Bypass all permission checks (dangerous — CI/testing only)
const manager = new PermissionManager({ mode: 'bypassPermissions' })
manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /' })
// → { behavior: 'allow', decisionReason: { type: 'mode', mode: 'bypassPermissions' } }

// Plan mode — everything prompts
const planManager = new PermissionManager({ mode: 'plan' })
planManager.check({ toolName: 'Read' })  // normally auto-allowed
// → { behavior: 'ask', ... }
```

---

## 14. Security & Ethics

### 14.1 Security Model

| Concern | Mitigation |
|---|---|
| Malicious rule injection | Settings files are user-controlled only. Never accept rules from untrusted input. |
| Rule conflicts | Deny always wins over allow when both match the same tool+content from the same source level. Higher-priority sources override lower. |
| Path traversal in rules | FileMatcher normalizes paths to POSIX, resolves `..`, and rejects absolute paths outside working directories. |
| Command injection in Bash rules | CommandMatcher treats `ruleContent` as a prefix pattern, not a shell command. No injection surface. |
| Settings file tampering | File permissions checked on load. Warning logged if world-writable. |
| Bypass mode misuse | `bypassPermissions` requires explicit CLI flag `--dangerously-skip-permissions`. Logged prominently. |

### 14.2 Data Sensitivity

| Data | Sensitivity | Stored |
|---|---|---|
| Permission rules | Medium | Local filesystem only |
| Decision logs | Low | In-memory only (optional) |
| Settings file paths | Low | Known locations (`~/.pi/`, `.pi/`) |

---

## 15. Changelog & Versioning

### v1.0.0

Initial release with core features:
- Three-way permission decisions (allow, deny, ask)
- Rule-based matching with wildcard patterns
- Command, file, and glob matchers
- Multi-source settings (user, project, local, CLI, session)
- File-based and in-memory storage backends
- Permission mode overrides (default, plan, bypassPermissions, acceptEdits)
- Zod validation for all settings and rules
- Read-only tool auto-allow classification

### Planned v1.1

- Hook system for pre/post permission check interception
- Permission logging/audit trail
- Diff-based permission suggestions (show what will change before applying)

### Planned v2.0

- ML-based auto-classifier (Claude Code's `auto` mode analog)
- IDE bridge permission proxy
- Multi-agent permission routing

---

## 16. Dependencies

| Package | Type | Purpose |
|---|---|---|
| `zod` | Runtime | Schema validation for settings and rules |
| `picomatch` | Runtime | Glob pattern matching for file and content rules |
| `vitest` | Dev | Test runner |
| `typescript` | Dev | Type checking |
| `@types/node` | Dev | Node.js type definitions |

**Runtime dependencies: 2** (zod, picomatch). Keeping this minimal is a design goal.