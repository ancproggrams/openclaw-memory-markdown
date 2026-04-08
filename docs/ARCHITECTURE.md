# Architecture

## Summary

Marq Memory is a markdown-first memory system for OpenClaw with a hybrid design:

- **canonical memory** for current truth
- **procedural memory** for repeatable action
- **maintenance memory** for health, promotion, and observability
- **archival memory** for historical raw recall

The main design decision is simple:

**markdown remains the source of truth, archival memory remains additive.**

This avoids a common failure mode in AI memory systems where raw historical discussion starts behaving like current truth.

## Why it was built this way

Most memory systems choose one of two extremes:

1. store compact curated facts only
2. store everything raw and search later

Marq Memory now deliberately combines both.

### What this solves

- current preferences and facts need to stay trustworthy
- procedures need to become reusable
- old conversations need to stay searchable
- raw session context should help recall, not overwrite canon

So the system is built as a layered stack with strict trust boundaries.

## Layer model

### Layer 1, Canonical markdown memory

Typical files:

- `MEMORY.md`
- `MEMORY_PREFERENCES.md`
- `KNOWLEDGE_FACTS.md`
- `memory/YYYY-MM-DD.md`
- `memory/facts/**/*.md`

Function:

- durable preferences
- durable facts
- stable project constraints
- append-only daily capture

This is the **authoritative layer**.

If the question is, "what is true now?", this layer wins.

---

### Layer 2, Operational sidecars

Append-only JSONL sidecars under `memory/operations/`:

- `memory/operations/tasks.jsonl`
- `memory/operations/workflows.jsonl`
- `memory/operations/procedure-candidates.jsonl`

Function:

- task deduplication
- resumability
- repeated-success detection
- candidate procedure capture

This layer exists to support learning and reuse without mutating canonical markdown directly.

---

### Layer 3, Procedural markdown memory

Files under `memory/procedures/`, for example:

- `memory/procedures/deployment.md`
- `memory/procedures/debugging.md`
- `memory/procedures/research.md`

Function:

- runbooks
- recovery playbooks
- reusable workflows
- task-oriented recall

This layer turns repeated successful work into readable operational memory.

---

### Layer 4, Promotion intelligence sidecars

Append-only JSONL files under `memory/`:

- `memory/registry.jsonl`
- `memory/promotions.jsonl`
- `memory/conflicts.jsonl`

Function:

- lifecycle tracking
- duplicate detection
- conflict logging
- inspectable promotion decisions

This layer is how the system stays auditable.

Nothing important should silently "just become memory" without a trace.

---

### Layer 5, Canonical recall layer

This layer is implemented by tools such as:

- `marq_memory_search`
- `marq_scene_recall`
- `marq_procedure_recall`
- `marq_memory_recall`

Function:

- search canonical markdown
- apply scene/project-aware ranking
- prefer procedures for task-like prompts
- keep recall adaptable without changing storage

This is the main read path for current truth and practical execution guidance.

---

### Layer 6, Archival conversation memory

Stored under `memory/archive/`:

- `memory/archive/conversations/sessions/`
- `memory/archive/chunks/`
- `memory/archive/indexes/`
- `memory/archive/entity_maps/`

Function:

- raw or near-verbatim session storage
- chunked historical retrieval
- historical reasoning recall
- decision context reconstruction

This layer is **non-canonical by design**.

It exists to answer questions like:

- why did we choose this?
- when was this discussed?
- what was the earlier reasoning?
- what happened in that session?

It does **not** define current truth on its own.

---

### Layer 7, Archive extraction and gated promotion

Sidecars and tools:

- `memory/archive/indexes/archive-candidates.jsonl`
- `marq_memory_archive_extract_candidates`
- `marq_memory_archive_promote`

Function:

- classify raw archive into likely durable signals
- extract reviewable candidates
- promote only through duplicate/conflict-aware gates

The archive classifier currently distinguishes lightweight signal types:

- `decision`
- `fact`
- `preference`
- `procedure-signal`

These signals are useful, but still not trusted enough to bypass the gate.

## Trust order

This is the most important runtime rule.

### Canon first, archive second

For current-state questions:

1. canonical markdown
2. procedures / registry
3. archive only as supporting historical context

For historical/context-heavy questions:

1. canonical memory for stable outcomes
2. archive for the earlier reasoning and raw discussion

This is why `marq_memory_recall` exists. It orchestrates retrieval without collapsing all memory into one undifferentiated search space.

## How it was built

The system evolved in stages.

### Phase 1

Build the canonical markdown + sidecar architecture:

- append-only daily memory
- promotions
- registry/conflicts/promotions logs
- local markdown recall

### Phase 2

Add procedural memory:

- task memory
- procedure candidate capture
- scene-grouped procedure markdown
- procedure-aware recall

### Phase 3

Add archival memory:

- raw session ingest
- chunk storage
- archive search
- unified recall

### Phase 4

Add archive-to-canon bridge:

- archive candidate extraction
- classifier-based signal detection
- gated promotion
- idempotent ingest
- incremental session ingest

## Session ingest behavior

The archive ingest pipeline now has two safety properties.

### Idempotent

The same archive content is not written repeatedly.

This is enforced using:

- `archiveId`
- `source`
- stable `contentHash`
- manifest-based dedupe

### Incremental

Unchanged session log files are skipped on reruns.

State is tracked in:

- `memory/archive/indexes/session-ingest-state.json`

This makes cron-based archival ingest fast enough for routine background use.

## Why the archival layer matters

Without archival memory, a system gets only the final promoted conclusion.
That is good for truth, but weak for reasoning recovery.

Without canonical memory, a system gets all old discussions but loses a reliable answer to "what applies now?"

The hybrid design keeps both:

- canon for correctness
- archive for context

## Maintenance model

The maintenance layer keeps the whole stack healthy over time.

Typical recurring jobs:

- reindex
- quality gate
- consolidation
- session archive ingest
- candidate extraction

This keeps the system operational instead of becoming a static pile of files.

## Philosophy

The guiding rule is:

**memory should be trustworthy before it becomes clever.**

In practice that means:

- source of truth is readable markdown
- promotion is explicit
- sidecars are additive
- archive is useful but non-authoritative
- retrieval can evolve without rewriting storage
