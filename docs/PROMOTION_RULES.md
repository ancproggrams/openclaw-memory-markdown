# Promotion Rules

Marq Memory promotion intelligence keeps markdown as source of truth while making promotion decisions explicit and inspectable.

## Input classes

Daily notes may contain typed entries such as:

- `[mem]`
- `[fact]`
- `[obs]`

## Current smart-promotion behavior

### `[mem]`

Promoted into `MEMORY_PREFERENCES.md` when the normalized entry is not already present.

### `[fact]`

Promoted into `KNOWLEDGE_FACTS.md` when the entry is not a duplicate and does not look like a conflicting near-match.

### `[obs]`

Currently skipped and tracked as non-promoted observation material.

## Sidecars

Promotion decisions are tracked in append-only sidecars:

- `memory/promotions.jsonl`
- `memory/conflicts.jsonl`
- `memory/registry.jsonl`

## Actions recorded

Promotions log actions include:

- `promoted`
- `skipped_duplicate`
- `conflict_detected`

## Dedup strategy

Current dedup is conservative and local-first:

- normalized text hash match
- near-duplicate token overlap threshold

## Conflict strategy

For facts, high-overlap but non-identical entries are treated as possible conflicts and written to `memory/conflicts.jsonl` instead of being silently appended.
