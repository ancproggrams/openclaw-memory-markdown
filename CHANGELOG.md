# Changelog

## 0.6.0 - 2026-03-30

Promotion intelligence and scene-aware recall release for Marq Memory vNext.

### Added
- `src/promotion.js` with smart promotion, registry, promotions, and conflicts sidecars
- `src/scene-recall.js` with scene-aware and project-aware ranking
- `marq_memory_promote` tool
- `marq_scene_recall` tool
- `scripts/promote-smart.js`
- docs for promotion rules and scene recall
- tests for smart promotion and scene-aware recall

### Changed
- `scripts/consolidate-memory.js` now uses smart promotion logic
- `scripts/quality-gate.js` now ensures promotion sidecars are ready
- package scripts expanded with `memory:promote-smart`
- package version advanced to `0.6.0`

## 0.4.0 - 2026-03-30

Expanded release with maintenance scripts and documented cron workflow.

### Added
- pre-compaction flush script
- daily consolidation script
- quality gate script
- reindex script
- documented cron jobs for memory maintenance
- explicit storage + recall + maintenance architecture explanation
- package scripts for maintenance operations

### Notes
- semantic search and auto-recall hooks are still planned for a later release

## 0.2.0 - 2026-03-30

Initial public-ready starter release.

### Added
- markdown-first OpenClaw memory plugin structure
- layered memory model documentation
- append-only daily memory writing
- local markdown recall tool
- config example
- Node test suite
- publish-oriented package metadata
