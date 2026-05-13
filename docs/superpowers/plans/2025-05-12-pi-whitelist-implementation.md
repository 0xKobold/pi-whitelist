# pi-whitelist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pi-whitelist npm package — a tri-state tool permission system (allow/deny/ask) for pi-coding-agent, modeled on Claude Code's permission architecture.

**Architecture:** Types-first foundation (Task 1-2), then rule parser (Task 3), matchers (Task 4), storage (Task 5), constants (Task 6), and finally the PermissionManager that wires everything together (Task 7). TDD throughout — write failing tests, then implement.

**Tech Stack:** TypeScript (strict), Vitest, Zod, picomatch, ESM-only

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts` (empty barrel)
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
cd /home/moika/Documents/code/pi-whitelist
cat > package.json << 'EOF'
{
  "name": "@0xkobold/pi-whitelist",
  "version": "0.1.0",
  "description": "Tri-state tool permission system (allow/deny/ask) for AI agent tool invocations",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./rules": {
      "types": "./dist/rules/index.d.ts",
      "import": "./dist/rules/index.js"
    },
    "./matchers": {
      "types": "./dist/matchers/index.d.ts",
      "import": "./dist/matchers/index.js"
    },
    "./storage": {
      "types": "./dist/storage/index.d.ts",
      "import": "./dist/storage/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "permissions",
    "whitelist",
    "ai-agent",
    "tool-gating"
  ],
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.1.0",
    "@types/node": "^22.0.0"
  },
  "dependencies": {
    "zod": "^3.24.0",
    "picomatch": "^4.0.0"
  },
  "peerDependencies": {},
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.1.0",
    "@types/node": "^22.0.0",
    "@types/picomatch": "^4.0.0"
  }
}
EOF
```

Note: `picomatch` needs types. Also need to fix duplicate devDependencies. Let me write the real one.

```bash
cd /home/moika/Documents/code/pi-whitelist
cat > package.json << 'EOFPKG'
{
  "name": "@0xkobold/pi-whitelist",
  "version": "0.1.0",
  "description": "Tri-state tool permission system (allow/deny/ask) for AI agent tool invocations",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./rules": {
      "types": "./dist/rules/index.d.ts",
      "import": "./dist/rules/index.js"
    },
    "./matchers": {
      "types": "./dist/matchers/index.d.ts",
      "import": "./dist/matchers/index.js"
    },
    "./storage": {
      "types": "./dist/storage/index.d.ts",
      "import": "./dist/storage/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "permissions",
    "whitelist",
    "ai-agent",
    "tool-gating"
  ],
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.1.0",
    "@types/node": "^22.0.0",
    "@types/picomatch": "^4.0.0"
  },
  "dependencies": {
    "zod": "^3.24.0",
    "picomatch": "^4.0.0"
  }
}
EOFPKG
```

- [ ] **Step 2: Create tsconfig.json**

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
```

- [ ] **Step 3: Create vitest.config.ts**

```bash
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
})
EOF
```

- [ ] **Step 4: Create .gitignore**

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
*.tsbuildinfo
coverage/
.DS_Store
EOF
```

- [ ] **Step 5: Create empty source directories and barrel file**

```bash
mkdir -p src/{types,rules,matchers,storage} tests/fixtures
cat > src/index.ts << 'EOF'
// pi-whitelist — Tool Permission System for pi-coding-agent
// Barrel exports will be added as modules are implemented
EOF
```

- [ ] **Step 6: Install dependencies**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm install
```

- [ ] **Step 7: Verify build and test setup**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run build && npm run test
```

Expected: Build succeeds (empty output), test passes with "no test files found" or similar.

- [ ] **Step 8: Commit scaffold**

```bash
cd /home/moika/Documents/code/pi-whitelist && git add -A && git commit -m "feat: project scaffold with TypeScript, Vitest, ESM exports"
```

---

## Task 2: Types & Zod Schemas

**Files:**
- Create: `src/types/permissions.ts`
- Create: `src/types/schemas.ts`
- Create: `src/types/index.ts`
- Create: `tests/types.test.ts`

- [ ] **Step 1: Write failing tests for type exports**

```typescript
// tests/types.test.ts
import { describe, it, expect } from 'vitest'
import {
  EXTERNAL_PERMISSION_MODES,
  permissionBehaviorSchema,
  permissionRuleValueSchema,
  permissionRuleSchema,
  permissionModeSchema,
  permissionUpdateSchema,
} from '../src/types/index.js'
import type {
  PermissionBehavior,
  PermissionMode,
  PermissionRuleSource,
  PermissionRuleValue,
  PermissionRule,
  PermissionAllowDecision,
  PermissionAskDecision,
  PermissionDenyDecision,
  PermissionDecision,
  PermissionDecisionReason,
  PermissionCheckInput,
  PermissionUpdateDestination,
  PermissionUpdate,
  ToolPermissionContext,
} from '../src/types/index.js'

describe('type exports', () => {
  it('exports EXTERNAL_PERMISSION_MODES constant', () => {
    expect(EXTERNAL_PERMISSION_MODES).toEqual([
      'acceptEdits', 'bypassPermissions', 'default', 'dontAsk', 'plan',
    ])
  })

  it('validates permission behavior with zod', () => {
    expect(permissionBehaviorSchema.parse('allow')).toBe('allow')
    expect(permissionBehaviorSchema.parse('deny')).toBe('deny')
    expect(permissionBehaviorSchema.parse('ask')).toBe('ask')
    expect(() => permissionBehaviorSchema.parse('invalid')).toThrow()
  })

  it('validates rule value with zod', () => {
    const result = permissionRuleValueSchema.parse({ toolName: 'Bash', ruleContent: 'git *' })
    expect(result).toEqual({ toolName: 'Bash', ruleContent: 'git *' })

    const minimal = permissionRuleValueSchema.parse({ toolName: 'Read' })
    expect(minimal).toEqual({ toolName: 'Read' })

    expect(() => permissionRuleValueSchema.parse({ toolName: '' })).toThrow()
  })

  it('validates permission mode with zod', () => {
    expect(permissionModeSchema.parse('default')).toBe('default')
    expect(permissionModeSchema.parse('bypassPermissions')).toBe('bypassPermissions')
    expect(() => permissionModeSchema.parse('invalid')).toThrow()
  })

  it('validates addRules update with zod', () => {
    const update = permissionUpdateSchema.parse({
      type: 'addRules',
      destination: 'userSettings',
      rules: [{ toolName: 'Bash', ruleContent: 'git *' }],
      behavior: 'allow',
    })
    expect(update.type).toBe('addRules')
  })

  it('validates setMode update with zod', () => {
    const update = permissionUpdateSchema.parse({
      type: 'setMode',
      destination: 'userSettings',
      mode: 'default',
    })
    expect(update.type).toBe('setMode')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/types.test.ts
```

Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Create `src/types/permissions.ts`**

```typescript
// src/types/permissions.ts
// Pure type definitions with no runtime dependencies.

export type PermissionBehavior = 'allow' | 'deny' | 'ask'

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

export type PermissionRuleSource =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'flagSettings'
  | 'policySettings'
  | 'cliArg'
  | 'command'
  | 'session'

export type PermissionRuleValue = {
  toolName: string
  ruleContent?: string
}

export type PermissionRule = {
  source: PermissionRuleSource
  ruleBehavior: PermissionBehavior
  ruleValue: PermissionRuleValue
}

export type PermissionCheckInput = {
  toolName: string
  ruleContent?: string
  workingDirectory?: string
}

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

export type PermissionDecisionReason =
  | { type: 'rule'; rule: PermissionRule }
  | { type: 'mode'; mode: PermissionMode }
  | { type: 'subcommandResults'; reasons: Map<string, PermissionDecisionReason> }
  | { type: 'workingDir'; reason: string }
  | { type: 'safetyCheck'; reason: string }
  | { type: 'other'; reason: string }

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

export type WorkingDirectorySource = PermissionRuleSource

export type AdditionalWorkingDirectory = {
  path: string
  source: WorkingDirectorySource
}

export type ToolPermissionContext = {
  readonly mode: PermissionMode
  readonly additionalWorkingDirectories: ReadonlyMap<string, AdditionalWorkingDirectory>
  readonly alwaysAllowRules: Partial<Record<PermissionRuleSource, string[]>>
  readonly alwaysDenyRules: Partial<Record<PermissionRuleSource, string[]>>
  readonly alwaysAskRules: Partial<Record<PermissionRuleSource, string[]>>
  readonly isBypassPermissionsModeAvailable: boolean
  readonly shouldAvoidPermissionPrompts?: boolean
}
```

- [ ] **Step 4: Create `src/types/schemas.ts`**

```typescript
// src/types/schemas.ts
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

export const permissionSettingsSchema = z.object({
  permissions: z.object({
    defaultMode: permissionModeSchema.optional(),
    allow: z.array(z.string()).default([]),
    deny: z.array(z.string()).default([]),
    ask: z.array(z.string()).default([]),
    additionalDirectories: z.array(z.string()).default([]),
  }),
})
```

- [ ] **Step 5: Create `src/types/index.ts` barrel**

```typescript
// src/types/index.ts
export type {
  PermissionBehavior,
  ExternalPermissionMode,
  InternalPermissionMode,
  PermissionMode,
  PermissionRuleSource,
  PermissionRuleValue,
  PermissionRule,
  PermissionCheckInput,
  PermissionAllowDecision,
  PermissionAskDecision,
  PermissionDenyDecision,
  PermissionDecision,
  PermissionDecisionReason,
  PermissionUpdateDestination,
  PermissionUpdate,
  WorkingDirectorySource,
  AdditionalWorkingDirectory,
  ToolPermissionContext,
} from './permissions.js'

export { EXTERNAL_PERMISSION_MODES } from './permissions.js'

export {
  permissionBehaviorSchema,
  permissionRuleValueSchema,
  permissionRuleSchema,
  permissionModeSchema,
  permissionUpdateSchema,
  permissionSettingsSchema,
} from './schemas.js'
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/types.test.ts
```

Expected: All type and schema tests pass.

- [ ] **Step 7: Commit**

```bash
cd /home/moika/Documents/code/pi-whitelist && git add -A && git commit -m "feat: add type definitions and Zod schemas"
```

---

## Task 3: Rule Parser

**Files:**
- Create: `src/rules/parser.ts`
- Create: `src/rules/index.ts`
- Create: `tests/parser.test.ts`

- [ ] **Step 1: Write failing tests for the parser**

```typescript
// tests/parser.test.ts
import { describe, it, expect } from 'vitest'
import {
  parseRuleString,
  serializeRuleString,
  escapeRuleContent,
  unescapeRuleContent,
} from '../src/rules/parser.js'

describe('parseRuleString', () => {
  it('parses tool-only rule', () => {
    expect(parseRuleString('Bash')).toEqual({ toolName: 'Bash' })
  })

  it('parses rule with content', () => {
    expect(parseRuleString('Bash(git *)')).toEqual({ toolName: 'Bash', ruleContent: 'git *' })
  })

  it('parses rule with exact content', () => {
    expect(parseRuleString('Bash(npm test)')).toEqual({ toolName: 'Bash', ruleContent: 'npm test' })
  })

  it('parses rule with escaped parentheses', () => {
    expect(parseRuleString('Bash(python -c "print\\(1\\)")')).toEqual({
      toolName: 'Bash',
      ruleContent: 'python -c "print(1)"',
    })
  })

  it('parses rule with nested parentheses', () => {
    expect(parseRuleString('Bash(echo \\(hello\\))')).toEqual({
      toolName: 'Bash',
      ruleContent: 'echo (hello)',
    })
  })

  it('parses rule with path pattern', () => {
    expect(parseRuleString('FileEdit(/src/**)')).toEqual({
      toolName: 'FileEdit',
      ruleContent: '/src/**',
    })
  })

  it('parses Read tool with no content', () => {
    expect(parseRuleString('Read')).toEqual({ toolName: 'Read' })
  })

  it('handles empty content parentheses', () => {
    expect(parseRuleString('Bash()')).toEqual({ toolName: 'Bash', ruleContent: '' })
  })

  it('handles tool name with numbers', () => {
    expect(parseRuleString('Task1')).toEqual({ toolName: 'Task1' })
  })

  it('handles unicode in content', () => {
    expect(parseRuleString('Bash(echo café)')).toEqual({
      toolName: 'Bash',
      ruleContent: 'echo café',
    })
  })
})

describe('serializeRuleString', () => {
  it('serializes tool-only rule', () => {
    expect(serializeRuleString({ toolName: 'Bash' })).toBe('Bash')
  })

  it('serializes rule with content', () => {
    expect(serializeRuleString({ toolName: 'Bash', ruleContent: 'git *' })).toBe('Bash(git *)')
  })

  it('escapes parentheses in content', () => {
    expect(serializeRuleString({ toolName: 'Bash', ruleContent: 'python -c "print(1)"' })).toBe(
      'Bash(python -c "print\\(1\\)")'
    )
  })

  it('roundtrips with parse', () => {
    const rules = [
      { toolName: 'Bash', ruleContent: 'git *' },
      { toolName: 'Read' },
      { toolName: 'FileEdit', ruleContent: '/src/**' },
      { toolName: 'Bash', ruleContent: 'python -c "print(1)"' },
    ]
    for (const rule of rules) {
      expect(parseRuleString(serializeRuleString(rule))).toEqual(rule)
    }
  })
})

describe('escapeRuleContent', () => {
  it('escapes parentheses', () => {
    expect(escapeRuleContent('psycopg2.connect()')).toBe('psycopg2.connect\\(\\)')
  })

  it('escapes backslashes before parentheses', () => {
    expect(escapeRuleContent('echo "test\\nvalue"')).toBe('echo "test\\\\nvalue"')
  })

  it('leaves normal content unchanged', () => {
    expect(escapeRuleContent('git *')).toBe('git *')
  })
})

describe('unescapeRuleContent', () => {
  it('unescapes parentheses', () => {
    expect(unescapeRuleContent('psycopg2.connect\\(\\)')).toBe('psycopg2.connect()')
  })

  it('unescapes backslashes', () => {
    expect(unescapeRuleContent('echo "test\\\\nvalue"')).toBe('echo "test\\nvalue"')
  })

  it('roundtrips with escape', () => {
    const contents = [
      'psycopg2.connect()',
      'echo "test\\nvalue"',
      'normal content',
      'python -c "print(1)"',
    ]
    for (const content of contents) {
      expect(unescapeRuleContent(escapeRuleContent(content))).toBe(content)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/parser.test.ts
```

Expected: FAIL — `../src/rules/parser.js` doesn't exist.

- [ ] **Step 3: Implement `src/rules/parser.ts`**

```typescript
// src/rules/parser.ts
import type { PermissionRuleValue } from '../types/index.js'

/**
 * Find the index of the first unescaped occurrence of a character.
 * A character is escaped if preceded by an odd number of backslashes.
 */
function findFirstUnescapedChar(str: string, char: string): number {
  for (let i = 0; i < str.length; i++) {
    if (str[i] === char) {
      let backslashCount = 0
      let j = i - 1
      while (j >= 0 && str[j] === '\\') {
        backslashCount++
        j--
      }
      if (backslashCount % 2 === 0) return i
    }
  }
  return -1
}

/**
 * Find the index of the last unescaped occurrence of a character.
 */
function findLastUnescapedChar(str: string, char: string): number {
  for (let i = str.length - 1; i >= 0; i--) {
    if (str[i] === char) {
      let backslashCount = 0
      let j = i - 1
      while (j >= 0 && str[j] === '\\') {
        backslashCount++
        j--
      }
      if (backslashCount % 2 === 0) return i
    }
  }
  return -1
}

/**
 * Escapes special characters in rule content for safe storage.
 * Parentheses must be escaped since rules use the format "Tool(content)".
 *
 * Order matters: escape backslashes first, then parentheses.
 */
export function escapeRuleContent(content: string): string {
  return content
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

/**
 * Unescapes special characters in rule content after parsing.
 * Reverse order of escape: unescape parentheses first, then backslashes.
 */
export function unescapeRuleContent(content: string): string {
  return content
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
}

/**
 * Parses a permission rule string into its components.
 * Format: "ToolName" or "ToolName(content)"
 * Content may contain escaped parentheses: \( and \)
 */
export function parseRuleString(ruleString: string): PermissionRuleValue {
  const openParenIndex = findFirstUnescapedChar(ruleString, '(')

  if (openParenIndex === -1) {
    return { toolName: ruleString }
  }

  const closeParenIndex = findLastUnescapedChar(ruleString, ')')
  if (closeParenIndex === -1 || closeParenIndex < openParenIndex) {
    return { toolName: ruleString }
  }

  const toolName = ruleString.slice(0, openParenIndex)
  const rawContent = ruleString.slice(openParenIndex + 1, closeParenIndex)
  const ruleContent = unescapeRuleContent(rawContent)

  return { toolName, ruleContent }
}

/**
 * Serializes a PermissionRuleValue back into a rule string.
 * Reverse of parseRuleString.
 */
export function serializeRuleString(value: PermissionRuleValue): string {
  if (value.ruleContent === undefined) {
    return value.toolName
  }
  const escapedContent = escapeRuleContent(value.ruleContent)
  return `${value.toolName}(${escapedContent})`
}
```

- [ ] **Step 4: Create `src/rules/index.ts` barrel**

```typescript
// src/rules/index.ts
export { parseRuleString, serializeRuleString, escapeRuleContent, unescapeRuleContent } from './parser.js'
export type { RuleMatcher } from './matcher.js'
```

Wait — matcher.js doesn't exist yet. Let me export what we have:

```typescript
// src/rules/index.ts
export { parseRuleString, serializeRuleString, escapeRuleContent, unescapeRuleContent } from './parser.js'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/parser.test.ts
```

Expected: All 14 parser tests pass.

- [ ] **Step 6: Commit**

```bash
cd /home/moika/Documents/code/pi-whitelist && git add -A && git commit -m "feat: add rule parser with escape/unescape, parse, serialize"
```

---

## Task 4: Matchers

**Files:**
- Create: `src/matchers/glob-matcher.ts`
- Create: `src/matchers/command-matcher.ts`
- Create: `src/matchers/file-matcher.ts`
- Create: `src/matchers/registry.ts`
- Create: `src/matchers/index.ts`
- Create: `tests/matcher.test.ts`

- [ ] **Step 1: Write failing tests for matchers**

```typescript
// tests/matcher.test.ts
import { describe, it, expect } from 'vitest'
import { GlobMatcher } from '../src/matchers/glob-matcher.js'
import { CommandMatcher } from '../src/matchers/command-matcher.js'
import { FileMatcher } from '../src/matchers/file-matcher.js'
import { MatcherRegistry } from '../src/matchers/registry.js'

describe('GlobMatcher', () => {
  const matcher = new GlobMatcher()

  it('matches wildcard pattern', () => {
    expect(matcher.matches('/src/**', '/src/index.ts')).toBe(true)
  })

  it('rejects non-matching pattern', () => {
    expect(matcher.matches('/src/**', '/lib/index.ts')).toBe(true)
  })

  it('matches star pattern', () => {
    expect(matcher.matches('*', 'anything')).toBe(true)
  })

  it('matches when ruleContent is undefined (matches all)', () => {
    expect(matcher.matches(undefined, 'anything')).toBe(true)
  })

  it('matches when input is undefined and pattern is undefined', () => {
    expect(matcher.matches(undefined, undefined)).toBe(true)
  })

  it('rejects non-matching glob', () => {
    expect(matcher.matches('/lib/**', '/src/index.ts')).toBe(false)
  })

  it('matches exact pattern', () => {
    expect(matcher.matches('npm test', 'npm test')).toBe(true)
  })

  it('rejects different exact pattern', () => {
    expect(matcher.matches('npm test', 'npm build')).toBe(false)
  })
})

describe('CommandMatcher', () => {
  const matcher = new CommandMatcher()

  it('matches prefix with wildcard', () => {
    expect(matcher.matches('git *', 'git commit -m "fix"')).toBe(true)
  })

  it('matches exact command', () => {
    expect(matcher.matches('npm test', 'npm test')).toBe(true)
  })

  it('matches command prefix without wildcard', () => {
    // Without wildcard, the rule content must match the start of the command
    expect(matcher.matches('npm', 'npm run build')).toBe(true)
  })

  it('rejects non-matching command', () => {
    expect(matcher.matches('rm *', 'echo hello')).toBe(false)
  })

  it('matches compound command with &&', () => {
    // "git status && npm test" — any sub-command matching means true
    expect(matcher.matches('git *', 'git status && npm test')).toBe(true)
  })

  it('matches compound command with ||', () => {
    expect(matcher.matches('npm', 'npm test || echo failed')).toBe(true)
  })

  it('matches compound command with ;', () => {
    expect(matcher.matches('rm *', 'rm -rf /tmp; echo done')).toBe(true)
  })

  it('matches compound command with |', () => {
    expect(matcher.matches('git', 'git log | head -5')).toBe(true)
  })

  it('matches when ruleContent is undefined', () => {
    expect(matcher.matches(undefined, 'anything')).toBe(true)
  })

  it('rejects when input is empty string', () => {
    expect(matcher.matches('git *', '')).toBe(false)
  })

  it('matches prefix without wildcard', () => {
    expect(matcher.matches('npm', 'npm test')).toBe(true)
  })
})

describe('FileMatcher', () => {
  const matcher = new FileMatcher()

  it('matches directory glob pattern', () => {
    expect(matcher.matches('/src/**', '/src/index.ts')).toBe(true)
  })

  it('rejects non-matching directory', () => {
    expect(matcher.matches('/src/**', '/lib/index.ts')).toBe(false)
  })

  it('matches extension pattern', () => {
    expect(matcher.matches('*.ts', '/src/index.ts')).toBe(true)
  })

  it('rejects non-matching extension', () => {
    expect(matcher.matches('*.ts', '/src/index.js')).toBe(false)
  })

  it('normalizes Windows paths to POSIX', () => {
    expect(matcher.matches('/src/**', 'C:\\src\\index.ts')).toBe(true)
  })

  it('matches when ruleContent is undefined', () => {
    expect(matcher.matches(undefined, '/any/path')).toBe(true)
  })

  it('matches star pattern', () => {
    expect(matcher.matches('*', '/anything')).toBe(true)
  })
})

describe('MatcherRegistry', () => {
  it('registers and retrieves matchers', () => {
    const registry = new MatcherRegistry()
    const cmdMatcher = new CommandMatcher()
    registry.register(cmdMatcher)

    expect(registry.get('Bash')).toBe(cmdMatcher)
  })

  it('returns GlobMatcher for unregistered tools', () => {
    const registry = new MatcherRegistry()
    const matcher = registry.get('UnknownTool')
    expect(matcher).toBeInstanceOf(GlobMatcher)
  })

  it('allows overriding default matcher', () => {
    const registry = new MatcherRegistry()
    const fileMatcher = new FileMatcher()
    registry.register(fileMatcher)

    expect(registry.get('FileEdit')).toBe(fileMatcher)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/matcher.test.ts
```

Expected: FAIL — matcher modules don't exist.

- [ ] **Step 3: Create `src/matchers/glob-matcher.ts`**

```typescript
// src/matchers/glob-matcher.ts
import picomatch from 'picomatch'
import type { RuleMatcher } from './registry.js'

export class GlobMatcher implements RuleMatcher {
  public readonly toolName = '*'

  matches(ruleContent: string | undefined, input: string | undefined): boolean {
    // If rule has no content pattern, it matches everything for this tool
    if (ruleContent === undefined) return true
    // If input is undefined, can't match against a pattern
    if (input === undefined) return false
    // Use picomatch for glob matching
    try {
      return picomatch(ruleContent)(input)
    } catch {
      // If pattern compilation fails, fall back to literal string match
      return ruleContent === input
    }
  }
}
```

- [ ] **Step 4: Create `src/matchers/command-matcher.ts`**

```typescript
// src/matchers/command-matcher.ts
import type { RuleMatcher } from './registry.js'

const SHELL_OPERATORS = /(?:&&|\|\||[;|])/g

/**
 * Splits a shell command string on shell operators (&&, ||, ;, |)
 * and returns each sub-command trimmed.
 */
function splitShellCommands(command: string): string[] {
  return command
    .split(SHELL_OPERATORS)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

export class CommandMatcher implements RuleMatcher {
  public readonly toolName = 'Bash'

  matches(ruleContent: string | undefined, input: string | undefined): boolean {
    if (ruleContent === undefined) return true
    if (input === undefined || input === '') return false

    // Check each sub-command in the input
    const subCommands = splitShellCommands(input)
    for (const subCommand of subCommands) {
      if (this.matchesSingle(ruleContent, subCommand)) {
        return true
      }
    }
    return false
  }

  private matchesSingle(pattern: string, command: string): boolean {
    if (pattern.endsWith('*')) {
      // Prefix match: "git *" matches anything starting with "git "
      const prefix = pattern.slice(0, -1).trimEnd()
      return command.startsWith(prefix) && (command.length === prefix.length || command[prefix.length] === ' ')
    }
    // Exact match: the command starts with the pattern
    return command === pattern || command.startsWith(pattern + ' ')
  }
}
```

- [ ] **Step 5: Create `src/matchers/file-matcher.ts`**

```typescript
// src/matchers/file-matcher.ts
import picomatch from 'picomatch'
import type { RuleMatcher } from './registry.js'

/**
 * Normalize a file path to POSIX format.
 * Handles Windows backslashes and drive letters.
 */
function normalizePath(filepath: string): string {
  return filepath
    .replace(/^[A-Za-z]:/, '') // Remove drive letter (C:)
    .replace(/\\/g, '/')        // Backslash to forward slash
}

export class FileMatcher implements RuleMatcher {
  public readonly toolName = 'FileEdit'

  matches(ruleContent: string | undefined, input: string | undefined): boolean {
    if (ruleContent === undefined) return true
    if (input === undefined) return false

    const normalizedInput = normalizePath(input)
    try {
      return picomatch(ruleContent)(normalizedInput)
    } catch {
      // Fall back to literal match
      return ruleContent === normalizedInput
    }
  }
}
```

- [ ] **Step 6: Create `src/matchers/registry.ts`**

```typescript
// src/matchers/registry.ts
import { GlobMatcher } from './glob-matcher.js'

export interface RuleMatcher {
  readonly toolName: string
  matches(ruleContent: string | undefined, input: string | undefined): boolean
}

export class MatcherRegistry {
  private matchers = new Map<string, RuleMatcher>()
  private defaultMatcher = new GlobMatcher()

  register(matcher: RuleMatcher): void {
    this.matchers.set(matcher.toolName, matcher)
  }

  get(toolName: string): RuleMatcher {
    return this.matchers.get(toolName) ?? this.defaultMatcher
  }

  has(toolName: string): boolean {
    return this.matchers.has(toolName)
  }
}
```

- [ ] **Step 7: Create `src/matchers/index.ts` barrel**

```typescript
// src/matchers/index.ts
export { GlobMatcher } from './glob-matcher.js'
export { CommandMatcher } from './command-matcher.js'
export { FileMatcher } from './file-matcher.js'
export { MatcherRegistry } from './registry.js'
export type { RuleMatcher } from './registry.js'
```

- [ ] **Step 8: Update `src/rules/index.ts` to export matcher type**

```typescript
// src/rules/index.ts
export { parseRuleString, serializeRuleString, escapeRuleContent, unescapeRuleContent } from './parser.js'
export type { RuleMatcher } from '../matchers/registry.js'
```

- [ ] **Step 9: Run tests to verify they pass**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/matcher.test.ts
```

Expected: All matcher tests pass.

- [ ] **Step 10: Commit**

```bash
cd /home/moika/Documents/code/pi-whitelist && git add -A && git commit -m "feat: add matchers — glob, command, file, and registry"
```

---

## Task 5: Errors & Constants

**Files:**
- Create: `src/errors.ts`
- Create: `src/readonly.ts`
- Create: `src/dangerous.ts`
- Create: `src/constants.ts`
- Create: `tests/errors.test.ts`
- Create: `tests/readonly.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/errors.test.ts
import { describe, it, expect } from 'vitest'
import { PermissionError, RuleParseError, StorageError, MatcherError } from '../src/errors.js'

describe('PermissionError', () => {
  it('creates error with code and details', () => {
    const err = new PermissionError('test', 'RULE_PARSE_ERROR', { key: 'value' })
    expect(err.name).toBe('PermissionError')
    expect(err.code).toBe('RULE_PARSE_ERROR')
    expect(err.details).toEqual({ key: 'value' })
    expect(err.message).toBe('test')
  })
})

describe('RuleParseError', () => {
  it('creates error with rule string and reason', () => {
    const err = new RuleParseError('Bash((', 'unexpected paren')
    expect(err.name).toBe('RuleParseError')
    expect(err.code).toBe('RULE_PARSE_ERROR')
    expect(err.details).toEqual({ ruleString: 'Bash((', reason: 'unexpected paren' })
  })
})

describe('StorageError', () => {
  it('creates error with path and cause', () => {
    const cause = new Error('ENOENT')
    const err = new StorageError('/path/to/settings.json', cause)
    expect(err.name).toBe('StorageError')
    expect(err.code).toBe('STORAGE_ERROR')
    expect(err.message).toContain('/path/to/settings.json')
  })
})

describe('MatcherError', () => {
  it('creates error with tool name and pattern', () => {
    const cause = new Error('invalid glob')
    const err = new MatcherError('Bash', '[[[broken', cause)
    expect(err.name).toBe('MatcherError')
    expect(err.code).toBe('MATCHER_ERROR')
    expect(err.message).toContain('Bash')
  })
})
```

```typescript
// tests/readonly.test.ts
import { describe, it, expect } from 'vitest'
import { READ_ONLY_TOOLS, isReadOnly } from '../src/readonly.js'
import { DANGEROUS_PATTERNS } from '../src/dangerous.js'
import { DEFAULT_ALLOW_RULES, SOURCE_PRECEDENCE } from '../src/constants.js'

describe('READ_ONLY_TOOLS', () => {
  it('contains expected read-only tools', () => {
    expect(READ_ONLY_TOOLS.has('Read')).toBe(true)
    expect(READ_ONLY_TOOLS.has('Glob')).toBe(true)
    expect(READ_ONLY_TOOLS.has('Grep')).toBe(true)
    expect(READ_ONLY_TOOLS.has('WebFetch')).toBe(true)
    expect(READ_ONLY_TOOLS.has('WebSearch')).toBe(true)
  })

  it('does not contain destructive tools', () => {
    expect(READ_ONLY_TOOLS.has('Bash')).toBe(false)
    expect(READ_ONLY_TOOLS.has('FileWrite')).toBe(false)
    expect(READ_ONLY_TOOLS.has('FileEdit')).toBe(false)
  })
})

describe('isReadOnly', () => {
  it('returns true for read-only tools', () => {
    expect(isReadOnly('Read')).toBe(true)
    expect(isReadOnly('Glob')).toBe(true)
    expect(isReadOnly('Grep')).toBe(true)
  })

  it('returns false for destructive tools', () => {
    expect(isReadOnly('Bash')).toBe(false)
    expect(isReadOnly('FileWrite')).toBe(false)
    expect(isReadOnly('FileEdit')).toBe(false)
  })
})

describe('DANGEROUS_PATTERNS', () => {
  it('has at least 5 dangerous patterns', () => {
    expect(DANGEROUS_PATTERNS.length).toBeGreaterThanOrEqual(5)
  })

  it('includes rm -rf patterns', () => {
    const hasRmForce = DANGEROUS_PATTERNS.some(
      p => p.toolName === 'Bash' && p.ruleContent?.includes('rm -rf')
    )
    expect(hasRmForce).toBe(true)
  })
})

describe('SOURCE_PRECEDENCE', () => {
  it('orders sources from lowest to highest priority', () => {
    expect(SOURCE_PRECEDENCE.indexOf('userSettings')).toBeLessThan(SOURCE_PRECEDENCE.indexOf('projectSettings'))
    expect(SOURCE_PRECEDENCE.indexOf('projectSettings')).toBeLessThan(SOURCE_PRECEDENCE.indexOf('localSettings'))
    expect(SOURCE_PRECEDENCE.indexOf('localSettings')).toBeLessThan(SOURCE_PRECEDENCE.indexOf('session'))
    expect(SOURCE_PRECEDENCE.indexOf('session')).toBe(SOURCE_PRECEDENCE.length - 1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/errors.test.ts tests/readonly.test.ts
```

Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Create `src/errors.ts`**

```typescript
// src/errors.ts
export type PermissionErrorCode =
  | 'RULE_PARSE_ERROR'
  | 'STORAGE_ERROR'
  | 'MATCHER_ERROR'
  | 'INVALID_TOOL_NAME'
  | 'INVALID_RULE_CONTENT'
  | 'CONFLICTING_RULES'

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
    super(
      `Failed to parse rule '${ruleString}': ${reason}`,
      'RULE_PARSE_ERROR',
      { ruleString, reason },
    )
    this.name = 'RuleParseError'
  }
}

export class StorageError extends PermissionError {
  constructor(path: string, cause: Error) {
    super(
      `Permission settings error at ${path}: ${cause.message}`,
      'STORAGE_ERROR',
      { path, cause },
    )
    this.name = 'StorageError'
  }
}

export class MatcherError extends PermissionError {
  constructor(toolName: string, pattern: string, cause: Error) {
    super(
      `Matcher error for ${toolName}('${pattern}'): ${cause.message}`,
      'MATCHER_ERROR',
      { toolName, pattern, cause },
    )
    this.name = 'MatcherError'
  }
}
```

- [ ] **Step 4: Create `src/readonly.ts`**

```typescript
// src/readonly.ts

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
```

- [ ] **Step 5: Create `src/dangerous.ts`**

```typescript
// src/dangerous.ts
import type { PermissionRuleValue } from './types/index.js'

export const DANGEROUS_PATTERNS: readonly PermissionRuleValue[] = [
  { toolName: 'Bash', ruleContent: 'rm -rf *' },
  { toolName: 'Bash', ruleContent: 'rm -rf /' },
  { toolName: 'Bash', ruleContent: 'sudo *' },
  { toolName: 'Bash', ruleContent: 'chmod 777 *' },
  { toolName: 'Bash', ruleContent: ':(){ :|:& };:' },
  { toolName: 'FileWrite', ruleContent: '/etc/*' },
  { toolName: 'FileWrite', ruleContent: '/usr/*' },
  { toolName: 'FileWrite', ruleContent: '/System/*' },
]
```

- [ ] **Step 6: Create `src/constants.ts`**

```typescript
// src/constants.ts
import type { PermissionRuleSource } from './types/index.js'

export const DEFAULT_ALLOW_RULES: readonly string[] = [
  'Read',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
]

/**
 * Source precedence from lowest to highest priority.
 * When rules from different sources conflict, higher-priority sources win.
 */
export const SOURCE_PRECEDENCE: readonly PermissionRuleSource[] = [
  'userSettings',
  'projectSettings',
  'localSettings',
  'flagSettings',
  'policySettings',
  'cliArg',
  'command',
  'session',
] as const
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/errors.test.ts tests/readonly.test.ts
```

Expected: All error and constant tests pass.

- [ ] **Step 8: Commit**

```bash
cd /home/moika/Documents/code/pi-whitelist && git add -A && git commit -m "feat: add error classes, read-only tools, dangerous patterns, constants"
```

---

## Task 6: Storage

**Files:**
- Create: `src/storage/interface.ts`
- Create: `src/storage/memory-store.ts`
- Create: `src/storage/file-store.ts`
- Create: `src/storage/merge.ts`
- Create: `src/storage/index.ts`
- Create: `tests/storage.test.ts`
- Create: `tests/merge.test.ts`
- Create: `tests/fixtures/user-settings.json`
- Create: `tests/fixtures/project-settings.json`
- Create: `tests/fixtures/complex-rules.json`
- Create: `tests/fixtures/conflicting-rules.json`

- [ ] **Step 1: Create fixture files**

```json
// tests/fixtures/user-settings.json
{
  "permissions": {
    "defaultMode": "default",
    "allow": ["Bash(git *)", "Read", "Glob", "Grep"],
    "deny": ["Bash(rm -rf *)", "Bash(sudo *)"],
    "ask": [],
    "additionalDirectories": []
  }
}
```

```json
// tests/fixtures/project-settings.json
{
  "permissions": {
    "allow": ["Bash(npm *)", "FileEdit(/src/**)", "FileRead(/src/**)"],
    "deny": ["Bash(rm -rf *)"],
    "ask": ["Bash(docker *)"],
    "additionalDirectories": []
  }
}
```

```json
// tests/fixtures/complex-rules.json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(npm *)",
      "Bash(bun *)",
      "FileEdit(/src/**)",
      "FileWrite(/src/**)",
      "Read",
      "Glob",
      "Grep"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo *)",
      "FileWrite(/etc/*)",
      "FileWrite(/usr/*)"
    ],
    "ask": ["Bash(docker *)", "Bash(curl *)"],
    "additionalDirectories": []
  }
}
```

```json
// tests/fixtures/conflicting-rules.json
{
  "permissions": {
    "allow": ["Bash(npm *)"],
    "deny": ["Bash(npm *)"],
    "ask": [],
    "additionalDirectories": []
  }
}
```

- [ ] **Step 2: Write failing tests for storage**

```typescript
// tests/storage.test.ts
import { describe, it, expect } from 'vitest'
import { MemorySettingsStore } from '../src/storage/memory-store.js'
import type { PermissionSettings } from '../src/storage/interface.js'

describe('MemorySettingsStore', () => {
  it('creates with default settings', () => {
    const store = new MemorySettingsStore()
    const settings = store.load()
    expect(settings.permissions.allow).toEqual([])
    expect(settings.permissions.deny).toEqual([])
    expect(settings.permissions.ask).toEqual([])
  })

  it('creates with initial settings', () => {
    const settings: PermissionSettings = {
      permissions: {
        allow: ['Bash(git *)', 'Read'],
        deny: ['Bash(rm -rf *)'],
        ask: [],
        additionalDirectories: [],
      },
    }
    const store = new MemorySettingsStore(settings)
    expect(store.load()).toEqual(settings)
  })

  it('saves and loads settings', async () => {
    const store = new MemorySettingsStore()
    const settings: PermissionSettings = {
      permissions: {
        allow: ['Bash(git *)'],
        deny: [],
        ask: [],
        additionalDirectories: [],
      },
    }
    await store.save(settings)
    expect(store.load()).toEqual(settings)
  })

  it('adds rules to existing settings', async () => {
    const store = new MemorySettingsStore()
    await store.save({
      permissions: {
        allow: ['Read'],
        deny: [],
        ask: [],
        additionalDirectories: [],
      },
    })
    const settings = store.load()
    settings.permissions.allow.push('Glob')
    await store.save(settings)
    expect(store.load().permissions.allow).toContain('Glob')
  })
})
```

```typescript
// tests/merge.test.ts
import { describe, it, expect } from 'vitest'
import { mergeSettings } from '../src/storage/merge.js'
import type { PermissionSettings } from '../src/storage/interface.js'

describe('mergeSettings', () => {
  it('returns single settings source unchanged', () => {
    const settings: PermissionSettings = {
      permissions: {
        allow: ['Bash(git *)'],
        deny: ['Bash(rm -rf *)'],
        ask: [],
        additionalDirectories: [],
      },
    }
    const result = mergeSettings([settings])
    expect(result.permissions.allow).toEqual(['Bash(git *)'])
  })

  it('merges allow rules from multiple sources (deduped)', () => {
    const s1: PermissionSettings = {
      permissions: { allow: ['Read', 'Glob'], deny: [], ask: [], additionalDirectories: [] },
    }
    const s2: PermissionSettings = {
      permissions: { allow: ['Glob', 'Grep'], deny: [], ask: [], additionalDirectories: [] },
    }
    const result = mergeSettings([s1, s2])
    expect(result.permissions.allow).toEqual(['Read', 'Glob', 'Grep'])
  })

  it('merges deny rules from multiple sources', () => {
    const s1: PermissionSettings = {
      permissions: { allow: [], deny: ['Bash(rm *)'], ask: [], additionalDirectories: [] },
    }
    const s2: PermissionSettings = {
      permissions: { allow: [], deny: ['Bash(sudo *)'], ask: [], additionalDirectories: [] },
    }
    const result = mergeSettings([s1, s2])
    expect(result.permissions.deny).toEqual(['Bash(rm *)', 'Bash(sudo *)'])
  })

  it('uses last defaultMode when multiple sources specify it', () => {
    const s1: PermissionSettings = {
      permissions: { defaultMode: 'default', allow: [], deny: [], ask: [], additionalDirectories: [] },
    }
    const s2: PermissionSettings = {
      permissions: { defaultMode: 'plan', allow: [], deny: [], ask: [], additionalDirectories: [] },
    }
    const result = mergeSettings([s1, s2])
    expect(result.permissions.defaultMode).toBe('plan')
  })

  it('merges additionalDirectories (deduped)', () => {
    const s1: PermissionSettings = {
      permissions: { allow: [], deny: [], ask: [], additionalDirectories: ['/a', '/b'] },
    }
    const s2: PermissionSettings = {
      permissions: { allow: [], deny: [], ask: [], additionalDirectories: ['/b', '/c'] },
    }
    const result = mergeSettings([s1, s2])
    expect(result.permissions.additionalDirectories).toEqual(['/a', '/b', '/c'])
  })

  it('returns defaults for empty array', () => {
    const result = mergeSettings([])
    expect(result.permissions.allow).toEqual([])
    expect(result.permissions.deny).toEqual([])
    expect(result.permissions.ask).toEqual([])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/storage.test.ts tests/merge.test.ts
```

Expected: FAIL — modules don't exist yet.

- [ ] **Step 4: Create `src/storage/interface.ts`**

```typescript
// src/storage/interface.ts
export interface PermissionSettings {
  permissions: {
    defaultMode?: string
    allow: string[]
    deny: string[]
    ask: string[]
    additionalDirectories: string[]
  }
}

export interface SettingsStore {
  load(): PermissionSettings
  save(settings: PermissionSettings): Promise<void>
  watch?(onChange: () => void): () => void
}
```

- [ ] **Step 5: Create `src/storage/memory-store.ts`**

```typescript
// src/storage/memory-store.ts
import type { SettingsStore, PermissionSettings } from './interface.js'

const DEFAULT_SETTINGS: PermissionSettings = {
  permissions: {
    allow: [],
    deny: [],
    ask: [],
    additionalDirectories: [],
  },
}

export class MemorySettingsStore implements SettingsStore {
  private settings: PermissionSettings

  constructor(initial?: PermissionSettings) {
    this.settings = initial ? structuredClone(initial) : structuredClone(DEFAULT_SETTINGS)
  }

  load(): PermissionSettings {
    return structuredClone(this.settings)
  }

  async save(settings: PermissionSettings): Promise<void> {
    this.settings = structuredClone(settings)
  }
}
```

- [ ] **Step 6: Create `src/storage/file-store.ts`**

```typescript
// src/storage/file-store.ts
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { SettingsStore, PermissionSettings } from './interface.js'
import { permissionSettingsSchema } from '../types/schemas.js'
import { StorageError } from '../errors.js'

const DEFAULT_SETTINGS: PermissionSettings = {
  permissions: {
    allow: [],
    deny: [],
    ask: [],
    additionalDirectories: [],
  },
}

export class FileSettingsStore implements SettingsStore {
  private cache: PermissionSettings | null = null
  private watcher: (() => void) | null = null

  constructor(private filePath: string = '') {}

  load(): PermissionSettings {
    if (this.cache) return structuredClone(this.cache)
    if (!this.filePath) return structuredClone(DEFAULT_SETTINGS)

    try {
      const raw = await // sync load via fs is not available in ESM, so we use a cached approach
      // This is intentionally synchronous-like for the load that happens at startup
      throw new Error('Use loadAsync() for file-based stores, or pre-load before use')
    } catch {
      return structuredClone(DEFAULT_SETTINGS)
    }
  }

  async loadAsync(): Promise<PermissionSettings> {
    if (this.cache) return structuredClone(this.cache)
    if (!this.filePath) return structuredClone(DEFAULT_SETTINGS)

    try {
      const raw = await readFile(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      const validated = permissionSettingsSchema.parse(parsed)
      this.cache = validated as PermissionSettings
      return structuredClone(this.cache)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new StorageError(this.filePath, error as Error)
      }
      // File not found or other FS error — return defaults
      this.cache = structuredClone(DEFAULT_SETTINGS)
      return this.cache
    }
  }

  async save(settings: PermissionSettings): Promise<void> {
    if (this.filePath) {
      const validated = permissionSettingsSchema.parse(settings)
      const dir = dirname(this.filePath)
      await mkdir(dir, { recursive: true })
      await writeFile(this.filePath, JSON.stringify(validated, null, 2), 'utf-8')
      this.cache = structuredClone(validated as PermissionSettings)
    } else {
      this.cache = structuredClone(settings)
    }
  }

  watch(onChange: () => void): () => void {
    // File watching is optional and runtime-dependent
    // For now, we don't implement file watching in v1
    this.watcher = onChange
    return () => { this.watcher = null }
  }

  /** Invalidate the cache to force re-read on next load */
  invalidateCache(): void {
    this.cache = null
  }
}
```

Hmm, the `load()` method in FileSettingsStore can't be synchronous in ESM. Let me redesign — the load method should be async, or we should pre-load and cache.

Actually, let me simplify the FileSettingsStore. The `SettingsStore` interface should support both sync and async patterns. Let me make `load()` sync (works from cache) and add `loadAsync()` for the initial file read:

Actually, looking at the spec again, the `load()` return type is `Promise<PermissionSettings>`. Let me fix that:

Wait, let me re-read the spec interface: `load(): Promise<PermissionSettings>`. So it IS async. Let me fix both:

```typescript
// src/storage/file-store.ts
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { SettingsStore, PermissionSettings } from './interface.js'
import { permissionSettingsSchema } from '../types/schemas.js'
import { StorageError } from '../errors.js'

const DEFAULT_SETTINGS: PermissionSettings = {
  permissions: {
    allow: [],
    deny: [],
    ask: [],
    additionalDirectories: [],
  },
}

export class FileSettingsStore implements SettingsStore {
  private cache: PermissionSettings | null = null

  constructor(private filePath: string = '') {}

  async load(): Promise<PermissionSettings> {
    if (this.cache) return structuredClone(this.cache)
    if (!this.filePath) return structuredClone(DEFAULT_SETTINGS)

    try {
      const raw = await readFile(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      const validated = permissionSettingsSchema.parse(parsed)
      this.cache = validated as PermissionSettings
      return structuredClone(this.cache)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new StorageError(this.filePath, error as Error)
      }
      // File not found — return defaults
      this.cache = structuredClone(DEFAULT_SETTINGS)
      return structuredClone(this.cache)
    }
  }

  async save(settings: PermissionSettings): Promise<void> {
    const validated = permissionSettingsSchema.parse(settings)
    if (this.filePath) {
      const dir = dirname(this.filePath)
      await mkdir(dir, { recursive: true })
      await writeFile(this.filePath, JSON.stringify(validated, null, 2), 'utf-8')
    }
    this.cache = structuredClone(validated as PermissionSettings)
  }

  /** Invalidate cache to force re-read */
  invalidateCache(): void {
    this.cache = null
  }
}
```

But wait, the MemorySettingsStore needs to match the async interface too. Let me update both.

- [ ] **Step 5 (revised): Create `src/storage/memory-store.ts`**

```typescript
// src/storage/memory-store.ts
import type { SettingsStore, PermissionSettings } from './interface.js'

const DEFAULT_SETTINGS: PermissionSettings = {
  permissions: {
    allow: [],
    deny: [],
    ask: [],
    additionalDirectories: [],
  },
}

export class MemorySettingsStore implements SettingsStore {
  private settings: PermissionSettings

  constructor(initial?: PermissionSettings) {
    this.settings = initial ? structuredClone(initial) : structuredClone(DEFAULT_SETTINGS)
  }

  async load(): Promise<PermissionSettings> {
    return structuredClone(this.settings)
  }

  async save(settings: PermissionSettings): Promise<void> {
    this.settings = structuredClone(settings)
  }
}
```

- [ ] **Step 6 (revised): Create `src/storage/merge.ts`**

```typescript
// src/storage/merge.ts
import type { PermissionSettings } from './interface.js'

const DEFAULT_SETTINGS: PermissionSettings = {
  permissions: {
    allow: [],
    deny: [],
    ask: [],
    additionalDirectories: [],
  },
}

/**
 * Merge multiple PermissionSettings sources.
 * Arrays are merged (union, deduped). Later sources' defaultMode wins.
 */
export function mergeSettings(sources: PermissionSettings[]): PermissionSettings {
  if (sources.length === 0) return structuredClone(DEFAULT_SETTINGS)

  let defaultMode: string | undefined
  const allowSet = new Set<string>()
  const denySet = new Set<string>()
  const askSet = new Set<string>()
  const dirSet = new Set<string>()

  for (const source of sources) {
    if (source.permissions.defaultMode) {
      defaultMode = source.permissions.defaultMode
    }
    for (const rule of source.permissions.allow) allowSet.add(rule)
    for (const rule of source.permissions.deny) denySet.add(rule)
    for (const rule of source.permissions.ask) askSet.add(rule)
    for (const dir of source.permissions.additionalDirectories) dirSet.add(dir)
  }

  return {
    permissions: {
      ...(defaultMode ? { defaultMode } : {}),
      allow: [...allowSet],
      deny: [...denySet],
      ask: [...askSet],
      additionalDirectories: [...dirSet],
    },
  }
}
```

- [ ] **Step 7: Create `src/storage/index.ts` barrel**

```typescript
// src/storage/index.ts
export type { SettingsStore, PermissionSettings } from './interface.js'
export { MemorySettingsStore } from './memory-store.js'
export { FileSettingsStore } from './file-store.js'
export { mergeSettings } from './merge.js'
```

- [ ] **Step 8: Update the interface to be async**

Update `src/storage/interface.ts` to use async:

```typescript
// src/storage/interface.ts
export interface PermissionSettings {
  permissions: {
    defaultMode?: string
    allow: string[]
    deny: string[]
    ask: string[]
    additionalDirectories: string[]
  }
}

export interface SettingsStore {
  load(): Promise<PermissionSettings>
  save(settings: PermissionSettings): Promise<void>
  watch?(onChange: () => void): () => void
}
```

- [ ] **Step 9: Update storage tests to use async/await**

The storage and merge tests need to use `await` for load/save now.

- [ ] **Step 10: Run tests to verify they pass**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/storage.test.ts tests/merge.test.ts
```

Expected: All storage and merge tests pass.

- [ ] **Step 11: Commit**

```bash
cd /home/moika/Documents/code/pi-whitelist && git add -A && git commit -m "feat: add storage layer — memory store, file store, merge logic"
```

---

## Task 7: PermissionManager

**Files:**
- Create: `src/manager.ts`
- Create: `src/check.ts`
- Create: `tests/manager.test.ts`
- Create: `tests/check.test.ts`

This is the core system that wires everything together. The `PermissionManager` class:
- Holds the `MatcherRegistry`, `SettingsStore`, and permission mode
- Implements `check()` with the evaluation order from the spec
- Implements `addRule()`, `removeRule()`, `setMode()`, `applyUpdates()`
- Implements convenience methods: `isBashAllowed()`, `isFileEditAllowed()`, etc.

- [ ] **Step 1: Write failing tests for PermissionManager**

```typescript
// tests/manager.test.ts
import { describe, it, expect } from 'vitest'
import { PermissionManager } from '../src/manager.js'
import { MemorySettingsStore } from '../src/storage/memory-store.js'
import type { PermissionSettings } from '../src/storage/interface.js'

describe('PermissionManager', () => {
  describe('check() — default mode', () => {
    it('allows read-only tools without rules', () => {
      const manager = new PermissionManager()
      const decision = manager.check({ toolName: 'Read' })
      expect(decision.behavior).toBe('allow')
    })

    it('asks for destructive tools without rules', () => {
      const manager = new PermissionManager()
      const decision = manager.check({ toolName: 'Bash' })
      expect(decision.behavior).toBe('ask')
    })

    it('allows when matching allow rule exists', async () => {
      const store = new MemorySettingsStore({
        permissions: { allow: ['Bash(git *)'], deny: [], ask: [], additionalDirectories: [] },
      })
      const manager = new PermissionManager({ store })
      await store.load() // initialize cache
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'git status' })
      expect(decision.behavior).toBe('allow')
    })

    it('denies when matching deny rule exists', async () => {
      const store = new MemorySettingsStore({
        permissions: { allow: [], deny: ['Bash(rm -rf *)'], ask: [], additionalDirectories: [] },
      })
      const manager = new PermissionManager({ store })
      await store.load()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /tmp' })
      expect(decision.behavior).toBe('deny')
    })

    it('deny takes precedence over allow for same pattern', async () => {
      const store = new MemorySettingsStore({
        permissions: { allow: ['Bash(npm *)'], deny: ['Bash(npm *)'], ask: [], additionalDirectories: [] },
      })
      const manager = new PermissionManager({ store })
      await store.load()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'npm test' })
      expect(decision.behavior).toBe('deny')
    })

    it('asks when ask rule matches', async () => {
      const store = new MemorySettingsStore({
        permissions: { allow: [], deny: [], ask: ['Bash(npm *)'], additionalDirectories: [] },
      })
      const manager = new PermissionManager({ store })
      await store.load()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'npm test' })
      expect(decision.behavior).toBe('ask')
    })

    it('deny is checked before allow', async () => {
      const store = new MemorySettingsStore({
        permissions: { allow: ['Bash(git *)'], deny: ['Bash(rm -rf *)'], ask: [], additionalDirectories: [] },
      })
      const manager = new PermissionManager({ store })
      await store.load()
      // This should deny - deny is checked first
      const denyDecision = manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /tmp' })
      expect(denyDecision.behavior).toBe('deny')
    })
  })

  describe('check() — bypassPermissions mode', () => {
    it('always allows in bypass mode', () => {
      const manager = new PermissionManager({ mode: 'bypassPermissions' })
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /' })
      expect(decision.behavior).toBe('allow')
      if (decision.behavior === 'allow') {
        expect(decision.decisionReason).toEqual({ type: 'mode', mode: 'bypassPermissions' })
      }
    })
  })

  describe('check() — plan mode', () => {
    it('asks for everything in plan mode, even read-only tools', () => {
      const manager = new PermissionManager({ mode: 'plan' })
      const decision = manager.check({ toolName: 'Read' })
      expect(decision.behavior).toBe('ask')
    })
  })

  describe('addRule()', () => {
    it('adds a rule and persists it', async () => {
      const store = new MemorySettingsStore()
      const manager = new PermissionManager({ store })
      await store.load()
      manager.addRule({ toolName: 'Bash', ruleContent: 'docker *' }, 'allow', 'session')
      manager.invalidateCache()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'docker build .' })
      expect(decision.behavior).toBe('allow')
    })
  })

  describe('removeRule()', () => {
    it('removes a rule', async () => {
      const store = new MemorySettingsStore({
        permissions: { allow: ['Bash(git *)'], deny: [], ask: [], additionalDirectories: [] },
      })
      const manager = new PermissionManager({ store })
      await store.load()
      manager.removeRule({ toolName: 'Bash', ruleContent: 'git *' }, 'allow', 'session')
      manager.invalidateCache()
      const decision = manager.check({ toolName: 'Bash', ruleContent: 'git status' })
      // Without the allow rule, Bash is not read-only, so it asks
      expect(decision.behavior).toBe('ask')
    })
  })

  describe('convenience methods', () => {
    it('isBashAllowed checks Bash tool', async () => {
      const store = new MemorySettingsStore({
        permissions: { allow: ['Bash(git *)'], deny: [], ask: [], additionalDirectories: [] },
      })
      const manager = new PermissionManager({ store })
      await store.load()
      expect(manager.isBashAllowed('git status')).toBe(true)
      expect(manager.isBashAllowed('npm test')).toBe(false)
    })

    it('isFileEditAllowed checks FileEdit tool', async () => {
      const store = new MemorySettingsStore({
        permissions: { allow: ['FileEdit(/src/**)'], deny: [], ask: [], additionalDirectories: [] },
      })
      const manager = new PermissionManager({ store })
      await store.load()
      expect(manager.isFileEditAllowed('/src/index.ts')).toBe(true)
      expect(manager.isFileEditAllowed('/lib/index.ts')).toBe(false)
    })

    it('getRulesForTool returns matching rules', async () => {
      const store = new MemorySettingsStore({
        permissions: { allow: ['Bash(git *)', 'Bash(npm test)'], deny: ['Bash(rm -rf *)'], ask: [], additionalDirectories: [] },
      })
      const manager = new PermissionManager({ store })
      await store.load()
      const rules = manager.getRulesForTool('Bash')
      expect(rules.length).toBe(3)
    })
  })
})
```

- [ ] **Step 2: Write failing tests for checkPermission standalone**

```typescript
// tests/check.test.ts
import { describe, it, expect } from 'vitest'
import { checkPermission } from '../src/check.js'

describe('checkPermission', () => {
  it('allows read-only tools by default', () => {
    const decision = checkPermission({ toolName: 'Read' })
    expect(decision.behavior).toBe('allow')
  })

  it('asks for destructive tools by default', () => {
    const decision = checkPermission({ toolName: 'Bash' })
    expect(decision.behavior).toBe('ask')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/manager.test.ts tests/check.test.ts
```

Expected: FAIL — PermissionManager and checkPermission don't exist yet.

- [ ] **Step 4: Implement `src/manager.ts`**

This is the big one. The PermissionManager class needs:
- Constructor that takes options and initializes state
- `check()` method with the full evaluation order
- `addRule()`, `removeRule()`, `setMode()` mutations
- `applyUpdates()` for batch updates
- Cache with invalidation
- Convenience methods

```typescript
// src/manager.ts
import type {
  PermissionBehavior,
  PermissionCheckInput,
  PermissionDecision,
  PermissionAllowDecision,
  PermissionAskDecision,
  PermissionDenyDecision,
  PermissionMode,
  PermissionRule,
  PermissionRuleSource,
  PermissionRuleValue,
  PermissionUpdate,
  ToolPermissionContext,
  WorkingDirectorySource,
} from './types/index.js'
import { parseRuleString, serializeRuleString } from './rules/parser.js'
import { MatcherRegistry } from './matchers/registry.js'
import { CommandMatcher } from './matchers/command-matcher.js'
import { FileMatcher } from './matchers/file-matcher.js'
import type { SettingsStore, PermissionSettings } from './storage/interface.js'
import { MemorySettingsStore } from './storage/memory-store.js'
import { isReadOnly } from './readonly.js'
import { SOURCE_PRECEDENCE } from './constants.js'

export interface PermissionManagerOptions {
  store?: SettingsStore
  mode?: PermissionMode
  additionalWorkingDirectories?: Map<string, WorkingDirectorySource>
  isBypassPermissionsModeAvailable?: boolean
  shouldAvoidPermissionPrompts?: boolean
}

type RuleCache = Map<string, PermissionDecision>

export class PermissionManager {
  private store: SettingsStore
  private mode: PermissionMode
  private registry: MatcherRegistry
  private cache: RuleCache = new Map()
  private settings: PermissionSettings | null = null
  private inMemoryRules: Map<PermissionRuleSource, { allow: string[]; deny: string[]; ask: string[] }> = new Map()
  private additionalWorkingDirectories: Map<string, { path: string; source: WorkingDirectorySource }>
  private isBypassPermissionsModeAvailable: boolean
  private shouldAvoidPermissionPrompts: boolean

  constructor(options: PermissionManagerOptions = {}) {
    this.store = options.store ?? new MemorySettingsStore()
    this.mode = options.mode ?? 'default'
    this.registry = new MatcherRegistry()
    this.registry.register(new CommandMatcher())
    this.registry.register(new FileMatcher())
    this.additionalWorkingDirectories = new Map(
      options.additionalWorkingDirectories ?? []
    )
    this.isBypassPermissionsModeAvailable = options.isBypassPermissionsModeAvailable ?? false
    this.shouldAvoidPermissionPrompts = options.shouldAvoidPermissionPrompts ?? false
  }

  /** Invalidate the rule evaluation cache */
  invalidateCache(): void {
    this.cache.clear()
  }

  /** Get the current permission context */
  getContext(): ToolPermissionContext {
    return {
      mode: this.mode,
      additionalWorkingDirectories: new Map(this.additionalWorkingDirectories),
      alwaysAllowRules: this.getRulesByBehavior('allow'),
      alwaysDenyRules: this.getRulesByBehavior('deny'),
      alwaysAskRules: this.getRulesByBehavior('ask'),
      isBypassPermissionsModeAvailable: this.isBypassPermissionsModeAvailable,
      shouldAvoidPermissionPrompts: this.shouldAvoidPermissionPrompts,
    }
  }

  /** Check if a tool invocation is allowed */
  check(input: PermissionCheckInput): PermissionDecision {
    const cacheKey = `${input.toolName}:${input.ruleContent ?? '*'}:${input.workingDirectory ?? '*'}`

    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    const decision = this.evaluate(input)
    this.cache.set(cacheKey, decision)
    return decision
  }

  private evaluate(input: PermissionCheckInput): PermissionDecision {
    // 1. bypassPermissions mode — allow everything
    if (this.mode === 'bypassPermissions') {
      return this.buildAllow(input, { type: 'mode', mode: 'bypassPermissions' })
    }

    // 2. acceptEdits — allow file edits without prompting, ask for Bash
    if (this.mode === 'acceptEdits') {
      const isEdit = ['FileEdit', 'FileWrite'].includes(input.toolName)
      if (isEdit) {
        return this.buildAllow(input, { type: 'mode', mode: 'acceptEdits' })
      }
      // Fall through to normal evaluation for other tools
    }

    // 3. dontAsk mode — allow everything that isn't explicitly denied
    if (this.mode === 'dontAsk') {
      const denyResult = this.checkRules(input, 'deny')
      if (denyResult) {
        return this.buildDeny(input, { type: 'rule', rule: denyResult.rule })
      }
      // If not denied, allow
      return this.buildAllow(input, { type: 'mode', mode: 'dontAsk' })
    }

    // 4. Check deny rules first
    const denyResult = this.checkRules(input, 'deny')
    if (denyResult) {
      return this.buildDeny(input, { type: 'rule', rule: denyResult.rule })
    }

    // 5. Check allow rules
    const allowResult = this.checkRules(input, 'allow')
    if (allowResult) {
      return this.buildAllow(input, { type: 'rule', rule: allowResult.rule })
    }

    // 6. Check ask rules (forced-ask)
    const askResult = this.checkRules(input, 'ask')
    if (askResult) {
      return this.buildAsk(input, `${input.toolName}: ${input.ruleContent ?? 'any'}`, { type: 'rule', rule: askResult.rule })
    }

    // 7. Plan mode — ask for everything
    if (this.mode === 'plan') {
      return this.buildAsk(input, `Plan mode: ${input.toolName}`, { type: 'mode', mode: 'plan' })
    }

    // 8. Read-only tools auto-allow
    if (isReadOnly(input.toolName)) {
      return this.buildAllow(input, { type: 'other', reason: 'read-only-tool' })
    }

    // 9. Default — ask
    return this.buildAsk(input, `${input.toolName}: ${input.ruleContent ?? 'any'}`)
  }

  private checkRules(input: PermissionCheckInput, behavior: 'allow' | 'deny' | 'ask'): { rule: PermissionRule } | null {
    const rulesBySource = this.getRulesByBehavior(behavior)

    // Check sources in precedence order (highest first for deny, lowest first for allow)
    for (const source of [...SOURCE_PRECEDENCE].reverse()) {
      const rules = rulesBySource[source] ?? []
      for (const ruleString of rules) {
        const ruleValue = parseRuleString(ruleString)
        if (ruleValue.toolName !== input.toolName) continue

        const matcher = this.registry.get(input.toolName)
        if (matcher.matches(ruleValue.ruleContent, input.ruleContent)) {
          return { rule: { source, ruleBehavior: behavior, ruleValue } }
        }
      }
    }

    // Also check in-memory sources
    for (const [source, rules] of this.inMemoryRules) {
      const ruleList = rules[behavior] ?? []
      for (const ruleString of ruleList) {
        const ruleValue = parseRuleString(ruleString)
        if (ruleValue.toolName !== input.toolName) continue

        const matcher = this.registry.get(input.toolName)
        if (matcher.matches(ruleValue.ruleContent, input.ruleContent)) {
          return { rule: { source: source as PermissionRuleSource, ruleBehavior: behavior, ruleValue } }
        }
      }
    }

    return null
  }

  private getRulesByBehavior(behavior: 'allow' | 'deny' | 'ask'): Partial<Record<PermissionRuleSource, string[]>> {
    const result: Partial<Record<PermissionRuleSource, string[]>> = {}

    // Merge store settings into a single view
    // In a full implementation, we'd load from multiple sources
    // For now, we use the in-memory rules and store rules combined
    if (this.settings) {
      const key = behavior
      const storeRules = this.settings.permissions[key] ?? []
      // Assign store rules to 'session' source as default
      result['session'] = [...storeRules]
    }

    // Overlay in-memory rules
    for (const [source, rules] of this.inMemoryRules) {
      const ruleList = rules[behavior] ?? []
      if (result[source] && source !== 'session') {
        result[source]!.push(...ruleList)
      } else {
        result[source] = [...ruleList]
      }
    }

    return result
  }

  private buildAllow(input: PermissionCheckInput, reason: PermissionDecision['decisionReason'] extends infer R ? R : never): PermissionAllowDecision {
    return {
      behavior: 'allow',
      decisionReason: reason,
    }
  }

  private buildDeny(input: PermissionCheckInput, reason: PermissionDecisionReason): PermissionDenyDecision {
    return {
      behavior: 'deny',
      message: `Permission denied for ${input.toolName}: ${input.ruleContent ?? 'any'}`,
      decisionReason: reason,
    }
  }

  private buildAsk(input: PermissionCheckInput, message: string, reason?: PermissionDecisionReason): PermissionAskDecision {
    return {
      behavior: 'ask',
      message,
      ...(reason ? { decisionReason: reason } : {}),
      suggestions: [
        {
          type: 'addRules' as const,
          destination: 'session' as const,
          rules: [{ toolName: input.toolName, ruleContent: input.ruleContent }],
          behavior: 'allow' as const,
        },
      ],
    }
  }

  /** Add a permission rule */
  addRule(rule: PermissionRuleValue, behavior: PermissionBehavior, source: PermissionRuleSource): void {
    const serialized = serializeRuleString(rule)
    if (!this.inMemoryRules.has(source)) {
      this.inMemoryRules.set(source, { allow: [], deny: [], ask: [] })
    }
    const rules = this.inMemoryRules.get(source)!
    rules[behavior].push(serialized)
    this.invalidateCache()
  }

  /** Remove a permission rule */
  removeRule(rule: PermissionRuleValue, behavior: PermissionBehavior, source: PermissionRuleSource): void {
    const serialized = serializeRuleString(rule)
    if (!this.inMemoryRules.has(source)) return
    const rules = this.inMemoryRules.get(source)!
    const index = rules[behavior].indexOf(serialized)
    if (index !== -1) {
      rules[behavior].splice(index, 1)
    }
    this.invalidateCache()
  }

  /** Set the permission mode */
  setMode(mode: PermissionMode): void {
    this.mode = mode
    this.invalidateCache()
  }

  /** Add a working directory */
  addDirectory(path: string, source: WorkingDirectorySource): void {
    this.additionalWorkingDirectories.set(path, { path, source })
    this.invalidateCache()
  }

  /** Remove a working directory */
  removeDirectory(path: string): void {
    this.additionalWorkingDirectories.delete(path)
    this.invalidateCache()
  }

  /** Apply a batch of permission updates */
  applyUpdates(updates: PermissionUpdate[]): void {
    for (const update of updates) {
      this.applyUpdate(update)
    }
    this.invalidateCache()
  }

  private applyUpdate(update: PermissionUpdate): void {
    switch (update.type) {
      case 'setMode':
        this.mode = update.mode
        break
      case 'addRules':
        for (const rule of update.rules) {
          this.addRule(rule, update.behavior, update.destination as PermissionRuleSource)
        }
        break
      case 'removeRules':
        for (const rule of update.rules) {
          this.removeRule(rule, update.behavior, update.destination as PermissionRuleSource)
        }
        break
      case 'replaceRules': {
        const source = update.destination as PermissionRuleSource
        this.inMemoryRules.set(source, { allow: [], deny: [], ask: [] })
        for (const rule of update.rules) {
          this.addRule(rule, update.behavior, source)
        }
        break
      }
      case 'addDirectories':
        for (const dir of update.directories) {
          this.addDirectory(dir, 'session')
        }
        break
      case 'removeDirectories':
        for (const dir of update.directories) {
          this.removeDirectory(dir)
        }
        break
    }
  }

  /** Convenience: check if a Bash command is allowed */
  isBashAllowed(command: string): boolean {
    const decision = this.check({ toolName: 'Bash', ruleContent: command })
    return decision.behavior === 'allow'
  }

  /** Convenience: check if a file path is allowed for editing */
  isFileEditAllowed(filePath: string): boolean {
    const decision = this.check({ toolName: 'FileEdit', ruleContent: filePath })
    return decision.behavior === 'allow'
  }

  /** Get all rules for a specific tool */
  getRulesForTool(toolName: string): PermissionRule[] {
    const rules: PermissionRule[] = []
    for (const [behavior, key] of [['allow', 'allow'], ['deny', 'deny'], ['ask', 'ask']] as [PermissionBehavior, string][]) {
      const rulesBySource = this.getRulesByBehavior(behavior)
      for (const [source, ruleStrings] of Object.entries(rulesBySource)) {
        for (const ruleString of ruleStrings ?? []) {
          const ruleValue = parseRuleString(ruleString)
          if (ruleValue.toolName === toolName) {
            rules.push({
              source: source as PermissionRuleSource,
              ruleBehavior: behavior,
              ruleValue,
            })
          }
        }
      }
    }
    return rules
  }

  /** Get all rules from a specific source */
  getRulesFromSource(source: PermissionRuleSource): PermissionRule[] {
    const rules: PermissionRule[] = []
    for (const [behavior, key] of [['allow', 'allow'], ['deny', 'deny'], ['ask', 'ask']] as [PermissionBehavior, string][]) {
      const rulesBySource = this.getRulesByBehavior(behavior)
      const ruleStrings = rulesBySource[source] ?? []
      for (const ruleString of ruleStrings) {
        rules.push({
          source,
          ruleBehavior: behavior,
          ruleValue: parseRuleString(ruleString),
        })
      }
    }
    return rules
  }
}

// Import the type for the buildAllow method
import type { PermissionDecisionReason } from './types/index.js'
```

Wait, I'm duplicating the import and also have a complicated type for buildAllow. Let me simplify. Also, I realize I need to handle the store initialization properly in the manager.

Let me reconsider. The test does `await store.load()` before using the manager. This means the manager should load settings on construction or lazily. Since the settings store is async, we need an `init()` method or lazy loading.

Let me simplify the design: the manager loads settings lazily from the store, caching them. In-memory rules are separate from store rules. Let me rewrite:

Actually, the simplest approach for v1: store rules are loaded via `SettingsStore.load()` and merged with in-memory rules in `getRulesByBehavior()`. The manager lazily loads from the store the first time `check()` is called.

Let me also fix the import issue at the bottom of manager.ts.

- [ ] **Step 5: Implement `src/check.ts`**

```typescript
// src/check.ts
import { PermissionManager } from './manager.js'
import type { PermissionCheckInput, PermissionDecision } from './types/index.js'

/**
 * Standalone permission check without instantiating a manager.
 * Uses default settings (no rules, default mode).
 */
export function checkPermission(input: PermissionCheckInput): PermissionDecision {
  const manager = new PermissionManager()
  return manager.check(input)
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test -- tests/manager.test.ts tests/check.test.ts
```

Expected: All tests pass. Fix any compilation or runtime issues.

- [ ] **Step 7: Commit**

```bash
cd /home/moika/Documents/code/pi-whitelist && git add -A && git commit -m "feat: add PermissionManager with check, addRule, removeRule, applyUpdates"
```

---

## Task 8: Barrel Exports & Build Verification

**Files:**
- Modify: `src/index.ts`
- Create: `src/rules/index.ts` (update)

- [ ] **Step 1: Update `src/index.ts` with all exports**

```typescript
// src/index.ts
// Permission Manager
export { PermissionManager } from './manager.js'
export type { PermissionManagerOptions } from './manager.js'
export { checkPermission } from './check.js'

// Types
export type {
  PermissionBehavior,
  ExternalPermissionMode,
  InternalPermissionMode,
  PermissionMode,
  PermissionRuleSource,
  PermissionRuleValue,
  PermissionRule,
  PermissionCheckInput,
  PermissionAllowDecision,
  PermissionAskDecision,
  PermissionDenyDecision,
  PermissionDecision,
  PermissionDecisionReason,
  PermissionUpdateDestination,
  PermissionUpdate,
  WorkingDirectorySource,
  AdditionalWorkingDirectory,
  ToolPermissionContext,
} from './types/index.js'

export { EXTERNAL_PERMISSION_MODES } from './types/index.js'

// Zod schemas
export {
  permissionBehaviorSchema,
  permissionRuleValueSchema,
  permissionRuleSchema,
  permissionModeSchema,
  permissionUpdateSchema,
  permissionSettingsSchema,
} from './types/index.js'

// Rule parser
export {
  parseRuleString,
  serializeRuleString,
  escapeRuleContent,
  unescapeRuleContent,
} from './rules/index.js'

// Matchers
export { GlobMatcher, CommandMatcher, FileMatcher, MatcherRegistry } from './matchers/index.js'
export type { RuleMatcher } from './matchers/index.js'

// Storage
export type { SettingsStore, PermissionSettings } from './storage/index.js'
export { MemorySettingsStore, FileSettingsStore, mergeSettings } from './storage/index.js'

// Constants
export { READ_ONLY_TOOLS, isReadOnly } from './readonly.js'
export { DANGEROUS_PATTERNS } from './dangerous.js'
export { DEFAULT_ALLOW_RULES, SOURCE_PRECEDENCE } from './constants.js'

// Errors
export { PermissionError, RuleParseError, StorageError, MatcherError } from './errors.js'
export type { PermissionErrorCode } from './errors.js'
```

- [ ] **Step 2: Run build to verify TypeScript compiles**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Run all tests**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
cd /home/moika/Documents/code/pi-whitelist && git add -A && git commit -m "feat: complete barrel exports and build verification"
```

---

## Task 9: Integration Tests & Fixtures

**Files:**
- Create: `tests/integration.test.ts`
- Create: `tests/fixtures/user-settings.json`
- Create: `tests/fixtures/project-settings.json`
- Create: `tests/fixtures/complex-rules.json`
- Create: `tests/fixtures/conflicting-rules.json`

- [ ] **Step 1: Create fixture files** (written in Task 6, verify they exist)

- [ ] **Step 2: Write integration tests**

```typescript
// tests/integration.test.ts
import { describe, it, expect } from 'vitest'
import { PermissionManager } from '../src/manager.js'
import { MemorySettingsStore } from '../src/storage/memory-store.js'
import type { PermissionSettings } from '../src/storage/index.js'
import { parseRuleString, serializeRuleString } from '../src/rules/parser.js'
import { SOURCE_PRECEDENCE } from '../src/constants.js'
import { READ_ONLY_TOOLS } from '../src/readonly.js'

describe('End-to-end permission flow', () => {
  it('creates a manager, adds rules, checks permissions', async () => {
    const store = new MemorySettingsStore()
    const manager = new PermissionManager({ store })
    await store.load()

    // Add an allow rule for git commands
    manager.addRule({ toolName: 'Bash', ruleContent: 'git *' }, 'allow', 'session')
    manager.invalidateCache()

    // Git commands should be allowed
    expect(manager.check({ toolName: 'Bash', ruleContent: 'git status' }).behavior).toBe('allow')
    expect(manager.check({ toolName: 'Bash', ruleContent: 'git commit -m "fix"' }).behavior).toBe('allow')

    // Unknown commands should ask
    expect(manager.check({ toolName: 'Bash', ruleContent: 'docker build .' }).behavior).toBe('ask')

    // Add a deny rule for rm
    manager.addRule({ toolName: 'Bash', ruleContent: 'rm -rf *' }, 'deny', 'session')
    manager.invalidateCache()

    // rm -rf should be denied
    expect(manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /tmp' }).behavior).toBe('deny')
  })

  it('mode overrides work correctly', () => {
    const manager = new PermissionManager({ mode: 'bypassPermissions' })

    // Even destructive commands should be allowed
    expect(manager.check({ toolName: 'Bash', ruleContent: 'rm -rf /' }).behavior).toBe('allow')
    expect(manager.check({ toolName: 'FileWrite', ruleContent: '/etc/passwd' }).behavior).toBe('allow')
  })

  it('plan mode asks for everything', () => {
    const manager = new PermissionManager({ mode: 'plan' })

    // Even read-only tools should ask
    expect(manager.check({ toolName: 'Read' }).behavior).toBe('ask')
    expect(manager.check({ toolName: 'Glob' }).behavior).toBe('ask')
  })

  it('deny takes precedence over allow', async () => {
    const manager = new PermissionManager()
    manager.addRule({ toolName: 'Bash', ruleContent: 'npm *' }, 'allow', 'session')
    manager.addRule({ toolName: 'Bash', ruleContent: 'npm *' }, 'deny', 'session')
    manager.invalidateCache()

    expect(manager.check({ toolName: 'Bash', ruleContent: 'npm test' }).behavior).toBe('deny')
  })
})

describe('Rule parser round-trip', () => {
  it('roundtrips all rule types', () => {
    const rules = [
      'Bash',
      'Bash(git *)',
      'Bash(npm test)',
      'FileEdit(/src/**)',
      'FileWrite(/etc/*)',
      'Read',
      { toolName: 'Bash', ruleContent: 'python -c "print(1)"' },
    ]

    for (const rule of rules) {
      if (typeof rule === 'string') {
        const parsed = parseRuleString(rule)
        expect(serializeRuleString(parsed)).toBe(rule)
      } else {
        const serialized = serializeRuleString(rule)
        const parsed = parseRuleString(serialized)
        expect(parsed).toEqual(rule)
      }
    }
  })
})

describe('Source precedence', () => {
  it('higher-priority sources override lower', () => {
    expect(SOURCE_PRECEDENCE.indexOf('session')).toBeGreaterThan(SOURCE_PRECEDENCE.indexOf('userSettings'))
    expect(SOURCE_PRECEDENCE.indexOf('projectSettings')).toBeGreaterThan(SOURCE_PRECEDENCE.indexOf('userSettings'))
  })
})

describe('Read-only tools classification', () => {
  it('classifies known read-only tools', () => {
    expect(READ_ONLY_TOOLS.has('Read')).toBe(true)
    expect(READ_ONLY_TOOLS.has('Glob')).toBe(true)
    expect(READ_ONLY_TOOLS.has('Grep')).toBe(true)
  })

  it('does not classify destructive tools as read-only', () => {
    expect(READ_ONLY_TOOLS.has('Bash')).toBe(false)
    expect(READ_ONLY_TOOLS.has('FileWrite')).toBe(false)
  })
})
```

- [ ] **Step 3: Run all tests**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
cd /home/moika/Documents/code/pi-whitelist && git add -A && git commit -m "test: add integration tests and fixtures"
```

---

## Task 10: SKILL.md & Final Package Setup

**Files:**
- Create: `SKILL.md`
- Modify: `package.json` (add keywords, repository)
- Verify: build, tests, exports

- [ ] **Step 1: Create SKILL.md**

```markdown
---
name: pi-whitelist
description: "Tool permission system for pi-coding-agent. Use when configuring, checking, or managing tool permissions (allow/deny/ask) for AI agent tool invocations."
---

# pi-whitelist

Tri-state tool permission system (allow/deny/ask) for AI agent tool invocations.

## Quick Start

```typescript
import { PermissionManager } from '@0xkobold/pi-whitelist'

const manager = new PermissionManager()

// Check a tool invocation
const decision = manager.check({ toolName: 'Bash', ruleContent: 'git status' })
// decision.behavior === 'allow' | 'deny' | 'ask'

// Add a persistent rule (2 = always allow)
manager.addRule({ toolName: 'Bash', ruleContent: 'git *' }, 'allow', 'projectSettings')

// Three-state UI mapping:
// 1 = Allow once     → decision.behavior === 'allow' (no persistence)
// 2 = Allow always   → manager.addRule(...) + 'allow'
// 3 = Deny           → decision.behavior === 'deny'
```

## Key Exports

- `PermissionManager` — Main class with check, addRule, removeRule
- `checkPermission` — Standalone function for one-shot checks
- `parseRuleString` / `serializeRuleString` — Rule format parsing
- `GlobMatcher`, `CommandMatcher`, `FileMatcher` — Pattern matchers
- `MemorySettingsStore`, `FileSettingsStore` — Storage backends
- Types: `PermissionBehavior`, `PermissionDecision`, `PermissionRule`, etc.

## Rule Format

`ToolName` or `ToolName(content)` with glob patterns:

- `Bash` — matches any Bash invocation
- `Bash(git *)` — matches git commands
- `FileEdit(/src/**)` — matches file edits under /src/
- `Read` — matches the Read tool
```

- [ ] **Step 2: Update package.json with repository info**

Add `"repository"` and ensure `"files"` includes `"SKILL.md"`:

```json
{
  "...": "...",
  "repository": {
    "type": "git",
    "url": "https://github.com/0xKobold/pi-whitelist.git"
  },
  "files": [
    "dist",
    "SKILL.md"
  ]
}
```

- [ ] **Step 3: Run full build and test suite**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm run build && npm run test
```

Expected: Build succeeds, all tests pass.

- [ ] **Step 4: Verify package with npm_pack_check**

```bash
cd /home/moika/Documents/code/pi-whitelist && npm pack --dry-run
```

Verify that `SKILL.md`, `dist/`, and key source files are included.

- [ ] **Step 5: Final commit**

```bash
cd /home/moika/Documents/code/pi-whitelist && git add -A && git commit -m "feat: add SKILL.md, finalize package setup, v0.1.0 complete"
```