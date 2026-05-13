# AGENTS.md

## Codebase Wiki

This project has an auto-maintained knowledge base at `.codebase-wiki/`.

### Keeping the Wiki Updated

- **After making code changes**, run `wiki_ingest` with source `commits` or `smart` to update affected pages.
- **After refactoring or adding modules**, run `wiki_ingest` with source `tree` to sync the file tree.
- **Periodically run `wiki_lint`** to catch contradictions, orphans, and stale pages.
- **When you create an ADR or major design decision**, use `wiki_decision` to record it.
- **When you add a cross-cutting pattern**, use `wiki_concept` to document it.
- **When you need context**, use `wiki_query` instead of grepping source files.

### Wiki Page Types

| Type | Directory | Purpose |
|------|-----------|---------|
| entity | `entities/` | Code modules, services, and components |
| concept | `concepts/` | Cross-cutting patterns and architectural themes |
| decision | `decisions/` | Architecture Decision Records (ADRs) |
| evolution | `evolution/` | Feature change history traced from git |
| query | `queries/` | Filed search queries for cross-referencing |

### Workflow

1. **Initialize**: `/wiki-init` creates `.codebase-wiki/` with SCHEMA.md, templates, and INDEX.md.
2. **Populate**: `wiki_ingest` with `tree` (initial), `commits` (incremental), `smart` (enrich), or `llm` (agent-written).
3. **Query**: `wiki_query` searches pages and files good queries back as new wiki pages.
4. **Lint**: `wiki_lint` checks for contradictions, orphans, stale pages, broken links.
5. **Evolve**: `wiki_evolve` traces how a feature changed over time from git history.

Pages are tracked in SQLite (`.codebase-wiki/meta/wiki.db`) and versioned in git.
Edit pages by hand or via tools — the wiki respects hand-edited content and won't overwrite it with stubs.
