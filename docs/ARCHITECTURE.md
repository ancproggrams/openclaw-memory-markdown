# Architecture

## Summary

Marq Memory is a markdown-first memory plugin for OpenClaw.

It uses the filesystem as the canonical storage layer and keeps memory readable by separating it into distinct layers.

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

## Read path

The current read path is intentionally simple:

1. collect configured files
2. skip oversized files
3. read markdown text locally
4. rank by term frequency
5. return short snippets

This keeps the first release dependency-light and easy to inspect.

## Write path

The current write path is intentionally narrow:

1. resolve the current date
2. target `memory/YYYY-MM-DD.md`
3. append the note
4. never rewrite older daily entries

## Why append-only matters

Append-only raw capture helps avoid silent corruption.

It preserves chronology and makes mistakes easier to audit.

## Upgrade path

The architecture was chosen so later versions can add:

- semantic retrieval
- temporal decay
- nightly promotion
- deduplication
- graph relations
- auto-recall hooks

without changing the underlying source-of-truth model.
