# Release notes

## Marq Memory v0.6.0

Marq Memory stays markdown-first, but now adds two new additive capabilities:

- promotion intelligence with explicit sidecar tracking
- scene-aware recall with scene/project ranking

### Included in this release

Tools:

- `marq_memory_search`
- `marq_memory_append`
- `marq_memory_explain`
- `marq_task_check`
- `marq_task_write`
- `marq_memory_promote`
- `marq_scene_recall`

Scripts:

- `scripts/pre-compaction-flush.js`
- `scripts/consolidate-memory.js`
- `scripts/promote-smart.js`
- `scripts/quality-gate.js`
- `scripts/reindex.js`

### What changed

- typed daily entries can now be promoted with duplicate and conflict tracking
- registry and promotion sidecars make lifecycle decisions inspectable
- scene-aware recall ranks deployment/debugging/coding-style hits above generic matches when possible

### Why this matters

A memory system gets more useful when it can both:

- avoid silently re-promoting the same durable content
- bring the right memory to the top for the current type of task
