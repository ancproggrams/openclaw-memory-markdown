# Marqs Memorie

**Marqs Memorie** is a markdown-first memory plugin for OpenClaw.

It keeps markdown as the source of truth while making the full memory model explicit in v1.0.0:

- **declarative memory** for durable facts, preferences, and notes
- **procedural memory** for repeatable runbooks and recovery playbooks
- **maintenance memory** for additive sidecars and scripts that keep the system healthy over time

## Architecture

### Layer 1 — Durable markdown storage

Typical files:

- `MEMORY.md`
- `MEMORY_PREFERENCES.md`
- `KNOWLEDGE_FACTS.md`
- `memory/YYYY-MM-DD.md`

These remain the readable, repairable source of truth.

### Layer 2 — Operational / maintenance memory sidecars

Append-only JSONL sidecars under `memory/operations/`:

- `memory/operations/tasks.jsonl`
- `memory/operations/workflows.jsonl`
- `memory/operations/procedure-candidates.jsonl`

These support task dedup, reuse, resumability, and procedural candidate capture without mutating curated markdown files.

Maintenance sidecars also include:

- `memory/skill-update-suggestions.jsonl`

### Layer 3 — Procedural memory markdown

Human-readable playbooks live under `memory/procedures/` and are grouped per scene:

- `memory/procedures/deployment.md`
- `memory/procedures/debugging.md`
- `memory/procedures/research.md`

These files are promoted from strong candidates while keeping markdown as the durable source of truth.

### Layer 4 — Promotion intelligence sidecars

Append-only JSONL sidecars under `memory/`:

- `memory/registry.jsonl`
- `memory/promotions.jsonl`
- `memory/conflicts.jsonl`

These record what got promoted, what was skipped as duplicate, and what was flagged as conflict.

### Layer 5 — Recall layer

The plugin ships with local markdown search plus scene-aware/project-aware ranking, with task-like prompts preferring procedural memory when useful.

This keeps retrieval replaceable while making it more task-relevant.

## Included tools

- `marq_memory_search`
- `marq_memory_append`
- `marq_memory_explain`
- `marq_task_check`
- `marq_task_write`
- `marq_memory_promote`
- `marq_procedure_recall`
- `marq_scene_recall`
- `marq_skill_update_suggestions`

`marq_task_write` now also captures procedure candidates once the same task succeeds repeatedly, and can attach lightweight recovery evidence when repeated failures are later resolved successfully.

## Maintenance scripts

- `npm run memory:flush`
- `npm run memory:consolidate`
- `npm run memory:promote-smart`
- `npm run memory:quality-gate`
- `npm run memory:reindex`
- `npm run memory:review-procedures`
- `npm run memory:promote-procedures`
- `npm run memory:skill-update-suggestions`

## Promotion intelligence in v0.6

Smart promotion now:

- parses typed daily entries (`[mem]`, `[fact]`, `[obs]`)
- promotes durable `[mem]` entries to `MEMORY_PREFERENCES.md`
- promotes durable `[fact]` entries to `KNOWLEDGE_FACTS.md`
- skips exact and near-duplicate entries
- flags possible fact conflicts into `memory/conflicts.jsonl`
- records lifecycle traces in `memory/promotions.jsonl` and `memory/registry.jsonl`

## Skill update suggestions in v1.0.0

Stable procedures can now generate additive skill-update suggestions into `memory/skill-update-suggestions.jsonl`.

This creates a lightweight bridge from proven procedural memory back into skill maintenance, without mutating existing markdown or procedure evidence.

## Procedure-aware recall in v0.9

`marq_procedure_recall` and the upgraded `marq_scene_recall` now:

- detect task-like / runbook-like prompts
- boost curated procedure markdown over generic declarative facts when appropriate
- surface recovery playbook sections when a procedure has repeated failure → recovery evidence

This stays additive on top of the existing local markdown search.

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
- `docs/PROCEDURAL_MEMORY.md`
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
