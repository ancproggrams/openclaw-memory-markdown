# Release notes

## Marq Memory v0.2.0

Marq Memory is a markdown-first memory plugin for OpenClaw.

This release focuses on a trustworthy foundation:

- layered memory instead of one giant memory blob
- append-only daily notes for raw capture
- curated core files for durable rules and facts
- transparent local recall over markdown
- no required API keys for the base version

### Why it exists

Many memory systems are powerful but opaque. Marq Memory starts from the opposite direction: make memory readable, inspectable, and repairable first.

### Included in this release

- `marq_memory_search`
- `marq_memory_append`
- `marq_memory_explain`
- publish-friendly package structure
- docs and tests

### Planned next

- semantic search
- recency weighting
- promotion pipeline
- optional graph links
- optional auto-recall hooks
