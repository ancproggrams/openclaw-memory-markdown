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
- `memory/archive/indexes/archive-candidates.jsonl`

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

### Layer 6 — Archival conversation memory

Additive raw historical material lives under `memory/archive/`:

- `memory/archive/conversations/sessions/`
- `memory/archive/chunks/`
- `memory/archive/indexes/`
- `memory/archive/entity_maps/`

This layer is intentionally non-canonical. It exists for historical recall, not current truth.

Archive candidates can be extracted into a reviewable sidecar and then promoted through the same duplicate/conflict-aware discipline used elsewhere. Raw archive never becomes canonical automatically.

The archive classifier now distinguishes lightweight signals such as:

- `decision`
- `fact`
- `preference`
- `procedure-signal`

This improves candidate extraction while keeping promotion gated.

Session archive ingest is now also incremental:

- unchanged session log files are skipped
- already ingested archive content is deduped
- ingest state is stored in `memory/archive/indexes/session-ingest-state.json`

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
- `marq_memory_archive_ingest`
- `marq_memory_archive_search`
- `marq_memory_archive_extract_candidates`
- `marq_memory_archive_promote`
- `marq_memory_recall`
- `marq_memory_archive_session_ingest`

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
- `npm run memory:archive-sessions`

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

## Unified recall

`marq_memory_recall` now orchestrates retrieval with a clear trust order:

1. canonical memory first
2. archive second for historical/context-heavy questions

This keeps current truth and historical recall separate while still making both accessible from one tool.

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

## How it works

At runtime the system behaves like this:

1. write durable raw notes append-only into daily memory
2. promote stable facts/preferences/procedures through inspectable gates
3. search canonical memory first for current truth
4. search archive second for historical reasoning and raw context
5. keep recurring health, ingest, and promotion logic in scripts and sidecars

So the system is not a flat search index. It is a layered memory stack with different trust levels.

## How it was built

The current state was built in four steps:

1. canonical markdown memory plus promotions and registry sidecars
2. procedural memory and recovery-aware recall
3. archival session memory with raw/chunked historical retrieval
4. archive classifier, gated archive promotion, idempotent ingest, and incremental session capture

That gives OpenClaw both a stable memory core and a historical recall layer.

## What each layer does

### Canonical markdown layer
- stores what should count as current truth
- readable and repairable by hand
- includes facts, preferences, daily memory, and curated files

### Operational sidecar layer
- stores task and workflow traces
- captures reuse signals
- supports resumability and candidate generation

### Procedural layer
- stores runbooks and repeatable recovery flows
- optimized for task-like recall

### Promotion intelligence layer
- decides what was promoted, skipped, or flagged
- records duplicates and conflicts
- protects canonical memory from silent drift

### Recall layer
- ranks canonical memory for active use
- prefers procedures when the prompt is task-like
- orchestrates canon-first retrieval

### Archival layer
- stores raw sessions and historical chunks
- optimized for why/when/context questions
- never automatically becomes canonical

### Archive bridge layer
- classifies archive material into likely durable signals
- extracts reviewable candidates
- promotes only through duplicate/conflict-aware gates

## Philosophy

**memory should be trustworthy before it becomes clever.**

In practice that means:

- markdown stays durable
- sidecars stay additive
- promotion decisions stay inspectable
- retrieval can improve without rewriting storage
- raw archive can improve historical recall without becoming canonical truth
