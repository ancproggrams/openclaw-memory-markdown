# Release Notes

## Marqs Memorie v1.0.0

Marqs Memorie now ships the full memory model explicitly: declarative memory, procedural memory, and maintenance memory.

### Highlights

- new `marq_skill_update_suggestions` tool for generating reviewable skill-update suggestions from stable procedures
- new `memory/skill-update-suggestions.jsonl` maintenance sidecar
- new `scripts/generate-skill-update-suggestions.js` helper
- docs now frame the architecture as declarative + procedural + maintenance memory end-to-end
- additive and backwards-compatible release; existing daily notes, sidecars, promotion flows, and recall flows continue to work

### Verification

```bash
npm test
npm pack --dry-run
```

## Marqs Memorie v0.9.0

Marqs Memorie now treats task-like recall as procedural first and can embed lightweight recovery playbooks in curated procedures.

### Highlights

- new `marq_procedure_recall` tool
- `marq_scene_recall` now boosts curated procedures for runbook/recovery-style prompts
- promoted procedure markdown can include recovery sections based on repeated failures that were later recovered successfully
- additive docs/tests updated for the new procedural recall path

## Marqs Memorie v0.8.0

Marqs Memorie now promotes strong procedure candidates into curated markdown playbooks grouped by scene.

### Highlights

- additive `memory/procedures/` support for scene-grouped playbooks
- promotion of strong candidates from `memory/operations/procedure-candidates.jsonl`
- new `scripts/promote-procedures.js` helper and npm script
- human-readable markdown blocks with evidence, artifacts, and verification cues
- tests and docs for procedure promotion to markdown

### Verification

```bash
npm test
npm pack --dry-run
```

## Marqs Memorie v0.7.0

Marqs Memorie now captures likely procedures before full procedural promotion exists.

### Highlights

- additive procedure candidate capture from repeated successful task records
- append-only `memory/operations/procedure-candidates.jsonl` sidecar
- review script for pending candidates
- procedural memory documentation and tests
