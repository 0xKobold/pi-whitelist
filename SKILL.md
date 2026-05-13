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