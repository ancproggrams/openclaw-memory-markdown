# Operational Memory

Operational memory is the sidecar layer for recurring task work.

It adds append-only JSONL stores under `memory/operations/` while keeping markdown as the source of truth for durable knowledge.

## Sidecar files

- `memory/operations/tasks.jsonl`
- `memory/operations/workflows.jsonl`

These files are created lazily.

## Why this exists

Markdown daily notes remain the canonical durable memory layer.

The JSONL sidecars exist for a different job:

- remembering prior task outcomes
- avoiding repeated successful work
- surfacing reusable workflows later
- keeping the new behavior inspectable and reversible

## Tools

### `marq_task_check`

Checks for similar prior task executions and returns:

- normalized fingerprint
- matched prior tasks
- prior status
- recommendation (`skip`, `reuse`, `resume`, `rerun`)
- confidence score

### `marq_task_write`

Appends one task execution outcome to `tasks.jsonl`.

Required fields:

- `taskDescription`
- `status`
- `summary`

Allowed statuses:

- `success`
- `failed`
- `partial`
- `cancelled`

## Design guardrail

Operational memory is a sidecar, not a replacement.

- markdown stays the durable source of truth
- JSONL stores task outcomes and operational metadata
- existing memory tools stay intact and backwards-compatible
