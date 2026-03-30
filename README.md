# Marq Memory

**Marq Memory** is a markdown-first memory plugin for OpenClaw.

It keeps markdown as the source of truth while adding additive sidecars for operational memory, promotion tracking, and scene-aware recall.

## Architecture

### Layer 1 — Durable markdown storage

Typical files:

- `MEMORY.md`
- `MEMORY_PREFERENCES.md`
- `KNOWLEDGE_FACTS.md`
- `memory/YYYY-MM-DD.md`

These remain the readable, repairable source of truth.

### Layer 2 — Operational memory sidecars

Append-only JSONL sidecars under `memory/operations/`:

- `memory/operations/tasks.jsonl`
- `memory/operations/workflows.jsonl`

These support task dedup, reuse, and resumability without mutating curated markdown files.

### Layer 3 — Promotion intelligence sidecars

Append-only JSONL sidecars under `memory/`:

- `memory/registry.jsonl`
- `memory/promotions.jsonl`
- `memory/conflicts.jsonl`

These record what got promoted, what was skipped as duplicate, and what was flagged as conflict.

### Layer 4 — Recall layer

The plugin ships with local markdown search plus scene-aware/project-aware ranking.

This keeps retrieval replaceable while making it more task-relevant.

## Included tools

- `marq_memory_search`
- `marq_memory_append`
- `marq_memory_explain`
- `marq_task_check`
- `marq_task_write`
- `marq_memory_promote`
- `marq_scene_recall`

## Maintenance scripts

- `npm run memory:flush`
- `npm run memory:consolidate`
- `npm run memory:promote-smart`
- `npm run memory:quality-gate`
- `npm run memory:reindex`

## Promotion intelligence in v0.6

Smart promotion now:

- parses typed daily entries (`[mem]`, `[fact]`, `[obs]`)
- promotes durable `[mem]` entries to `MEMORY_PREFERENCES.md`
- promotes durable `[fact]` entries to `KNOWLEDGE_FACTS.md`
- skips exact and near-duplicate entries
- flags possible fact conflicts into `memory/conflicts.jsonl`
- records lifecycle traces in `memory/promotions.jsonl` and `memory/registry.jsonl`

## Scene-aware recall in v0.6

`marq_scene_recall` ranks results using:

- text match score
- inferred or explicit scene
- project match
- file-path hints from memory/docs structure

This stays additive on top of the existing local markdown search.

## Installation

```bash
npm install
```

Then configure the plugin in OpenClaw and point `workspaceRoot` to the right folder.

See `examples/openclaw.config.example.json`.

## Documentation

- `docs/OPERATIONS_MEMORY.md`
- `docs/PROMOTION_RULES.md`
- `docs/SCENE_RECALL.md`
- `docs/CRON_JOBS.md`
- `docs/ARCHITECTURE.md`
- `docs/USAGE.md`

## Verification

```bash
npm test
npm pack --dry-run
```

## Philosophy

**memory should be trustworthy before it becomes clever.**

In practice that means:

- markdown stays durable
- sidecars stay additive
- promotion decisions stay inspectable
- retrieval can improve without rewriting storage
