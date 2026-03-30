# Changelog

## 1.0.0 - 2026-03-30

Declarative + procedural + maintenance memory framing completed.

### Added

- `src/skill-update-suggestions.js` for deriving additive skill update suggestions from stable procedures
- `marq_skill_update_suggestions` tool
- `scripts/generate-skill-update-suggestions.js`
- `memory/skill-update-suggestions.jsonl` seed sidecar
- tests covering promoted-procedure suggestion generation and idempotence

### Changed

- docs/README/release notes now explicitly frame the system as declarative, procedural, and maintenance memory
- package and plugin metadata advanced to `1.0.0`

## 0.9.0 - 2026-03-30

Procedure-aware recall and recovery playbooks.

### Added

- `marq_procedure_recall` for explicit procedure-first task recall
- task-like recall boosting for curated procedure markdown in `marq_scene_recall`
- lightweight recovery playbook capture from repeated failures followed by successful recoveries
- tests for procedure recall and recovery markdown rendering

### Changed

- procedural markdown can now include `Recovery playbook` sections
- package version advanced to `0.9.0`

## 0.8.0 - 2026-03-30

Curated procedure markdown release for Marq Memory vNext.

### Added

- `memory/procedures/` support for scene-grouped markdown playbooks
- promotion flow from strong procedure candidates into human-readable markdown
- `src/procedures.js` helpers for procedure markdown paths, rendering, selection, and promotion
- `scripts/promote-procedures.js`
- procedural promotion tests covering markdown output and idempotent promotion

### Changed

- `marq_memory_explain` now reports the curated procedure directory path
- procedural docs and usage updated for Phase P2
- package version advanced to `0.8.0`

## 0.7.0 - 2026-03-30

Procedure candidate capture release for Marq Memory vNext.

### Added

- `src/procedures.js` for detecting repeated successful task patterns and capturing procedure candidates
- `memory/operations/procedure-candidates.jsonl` sidecar creation and review flow
- `scripts/review-procedure-candidates.js`
- `docs/PROCEDURAL_MEMORY.md`
- tests for candidate capture behavior

### Changed

- `marq_memory_explain` now reports the procedure candidate sidecar path
- package version advanced to `0.7.0`

## 0.6.0 - 2026-03-30

Scene-aware recall and smart promotion sidecars.

### Added

- typed daily-note parsing with smart promotion into durable markdown
- duplicate and conflict sidecars: `memory/registry.jsonl`, `memory/promotions.jsonl`, `memory/conflicts.jsonl`
- `marq_memory_promote` tool
- scene-aware recall tool `marq_scene_recall`
- release docs for promotion rules and scene recall

### Changed

- architecture and README updated for promotion intelligence and recall layering
- package version advanced to `0.6.0`
