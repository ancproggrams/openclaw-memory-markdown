# Procedural Memory

Procedural memory turns repeated successful work into curated, human-readable runbooks.

## Phase P1 — candidate capture

Phase P1 adds **procedure candidate capture** from repeated successful task records.

Append-only candidate store:

- `memory/operations/procedure-candidates.jsonl`

A procedure candidate is generated when the task sidecar contains at least **two successful reusable records** for the same normalized task fingerprint + scene + project + task type combination.

The capture stays conservative:

- only successful task outcomes marked `reusable: true` count
- one-off successes do not create a candidate
- existing candidates are not duplicated
- markdown remains the durable source of truth

Each candidate records:

- stable candidate id/key
- fingerprint, scene, project, task type
- occurrence count
- first/last seen timestamps
- sample task descriptions
- summaries
- artifacts
- recent verification signals
- review status (`pending-review`)

Review pending candidates with:

```bash
npm run memory:review-procedures
```

Or include all statuses:

```bash
node scripts/review-procedure-candidates.js all
```

## Phase P2 — curated procedure markdown

Phase P2 promotes strong candidates into scene-grouped markdown playbooks under:

- `memory/procedures/deployment.md`
- `memory/procedures/debugging.md`
- `memory/procedures/research.md`
- `memory/procedures/general.md`

Promotion stays additive:

- candidate evidence remains in `memory/operations/procedure-candidates.jsonl`
- promoted candidates receive a newer `promoted` record in the same sidecar
- markdown playbooks are created lazily and remain human-editable
- existing promoted procedure blocks are not duplicated

Promote the current strong pending candidates with:

```bash
npm run memory:promote-procedures
```

Or require a higher minimum occurrence count:

```bash
node scripts/promote-procedures.js 3
```

## Markdown structure

Each promoted procedure contains:

- procedure id and fingerprint
- scene, project, task type
- observed success count and timestamps
- repeatable flow examples from prior task descriptions
- evidence snippets from successful summaries
- expected artifacts
- verification cues
- optional recovery playbook sections built from repeated failures followed by successful recoveries
- maintenance notes for future human updates

## Phase P3 — procedure-aware recall and recovery playbooks

Phase P3 adds two pragmatic capabilities:

- `marq_procedure_recall` for explicit procedure-first retrieval
- task-like boosting inside `marq_scene_recall`, so procedures can outrank generic declarative notes when the prompt looks like a runbook/recovery request

Recovery playbooks stay lightweight and additive:

- they are derived from repeated failed/partial attempts that are later followed by successful reusable runs for the same candidate key
- they record common failure summaries plus short recovery evidence from the successful summaries
- they are rendered inside the curated procedure markdown instead of creating a second opaque store

## Design guardrail

Procedure candidates are evidence. Curated markdown is the durable operational playbook.

That keeps the system additive, readable, and backwards-compatible:

- JSONL sidecars remain machine-friendly traces
- markdown remains the human-friendly source of truth
- later phases can enrich procedures without rewriting prior captures

## Phase P4 — skill update suggestions and complete memory framing

Phase P4 closes the v1.0.0 loop by making the full model explicit:

- **declarative memory** = durable markdown facts, preferences, and daily notes
- **procedural memory** = curated scene-grouped runbooks and recovery playbooks
- **maintenance memory** = additive sidecars and scripts that keep memory quality high and feed improvements back into skills

New maintenance sidecar:

- `memory/skill-update-suggestions.jsonl`

New maintenance bridge:

- stable procedures can emit `pending-review` skill update suggestions
- by default this only happens for promoted procedures with enough repeated successful evidence
- suggestions remain additive and reviewable; they do not rewrite skills automatically

Generate the suggestions with:

```bash
npm run memory:skill-update-suggestions
```

Or from the OpenClaw tool surface with `marq_skill_update_suggestions`.
