# Release notes

## Marq Memory v0.3.0

Marq Memory is a markdown-first memory plugin for OpenClaw.

This release expands the base plugin with the maintenance side that belongs to the memory system:

- layered memory instead of one giant memory blob
- append-only daily notes for raw capture
- curated core files for durable rules and facts
- a separate recall layer on top of durable markdown storage
- maintenance scripts for flush, consolidation, quality checks, and reindex
- documented cron jobs for recurring memory hygiene

### Included in this release

- `marq_memory_search`
- `marq_memory_append`
- `marq_memory_explain`
- `scripts/pre-compaction-flush.js`
- `scripts/consolidate-memory.js`
- `scripts/quality-gate.js`
- `scripts/reindex.js`

### Why this matters

A useful memory system is not only retrieval. It also needs recurring maintenance so raw notes become durable memory and retrieval stays healthy over time.

### Still planned

- semantic search
- recency weighting
- smarter promotion logic
- optional graph links
- optional auto-recall hooks
