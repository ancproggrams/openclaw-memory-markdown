# Architecture

## Summary

Marq Memory is a markdown-first memory plugin for OpenClaw.

It uses the filesystem as the canonical storage layer and keeps memory readable by separating it into distinct layers.

The design is based on three cooperating memory modes:

1. declarative memory
2. procedural memory
3. maintenance memory

That distinction matters. Declarative memory keeps durable truth. Procedural memory captures repeatable action. Maintenance memory keeps both healthy and continuously improvable over time.

## Layers

### Core layer

This layer contains compact durable files such as:

- `MEMORY.md`
- `MEMORY_PREFERENCES.md`
- `KNOWLEDGE_FACTS.md`

Role:

- stable preferences
- durable rules
- reusable facts

### Daily layer

This layer contains append-only daily files:

- `memory/YYYY-MM-DD.md`

Role:

- chronological durable notes
- safe writes
- raw memory capture

### Supporting layer

This layer contains broader searchable markdown:

- `memory/**/*.md`
- `memory/facts/**/*.md`
- `docs/**/*.md`

Role:

- wider recall surface
- operational context
- project memory beyond the compact core

### Recall layer

The recall layer sits on top of the markdown files.

In this version it is implemented as lightweight local search over the configured files.

In a more advanced setup, this same layer can be backed by an index, embeddings, or a database.

Important: that database is not the source of truth. It is a retrieval aid.

### Maintenance layer

The maintenance layer keeps the system usable over time.

It includes:

- pre-compaction flush
- nightly consolidation
- quality gate checks
- recurring reindex / scan jobs
- skill update suggestion sidecars derived from stable procedures

## Read path

The current read path is intentionally simple:

1. collect configured files
2. skip oversized files
3. read markdown text locally
4. rank by term frequency
5. return short snippets

This keeps the first release dependency-light and easy to inspect.

Conceptually, this is already the recall layer. It can later be swapped for or augmented with semantic indexing without changing the durable storage model.

## Write path

The current write path is intentionally narrow:

1. resolve the current date
2. target `memory/YYYY-MM-DD.md`
3. append the note
4. never rewrite older daily entries

## Why append-only matters

Append-only raw capture helps avoid silent corruption.

It preserves chronology and makes mistakes easier to audit.

## Cooperation between the layers

The full system works like this:

- declarative markdown stores durable memory
- curated procedural markdown stores repeatable runbooks
- search or indexing retrieves the right subset when needed
- maintenance sidecars and scripts keep new notes promoted, checked, and suggest where skills should be updated

That cooperation is the point of the design. A memory system fails when one of those layers is missing.

## Upgrade path

The architecture was chosen so later versions can add:

- semantic retrieval
- temporal decay
- nightly promotion
- deduplication
- graph relations
- auto-recall hooks

without changing the underlying source-of-truth model.
