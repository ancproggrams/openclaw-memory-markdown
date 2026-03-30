# Scene-aware Recall

Marq Memory scene-aware recall improves ranking without replacing the existing markdown search layer.

## Tool

Use `marq_scene_recall` with:

- `query`
- optional `scene`
- optional `project`
- optional `taskLike`
- optional `maxResults`

## Ranking inputs

Results are ranked using a blend of:

1. term match score from the markdown content
2. explicit or inferred scene
3. project matches in path or content
4. path hints from the memory/docs structure
5. extra preference for `memory/procedures/*.md` on task-like prompts

## Procedure-aware behavior

For prompts that look like tasks, incidents, recovery requests, or runbook queries, scene recall now boosts curated procedure files and recovery sections above generic facts when both match.

Use `marq_procedure_recall` when you want that behavior explicitly.

## Initial scene set

Current heuristic scenes include:

- `coding`
- `deployment`
- `debugging`
- `research`
- `ops`
- `content`
- `memory-maintenance`
- `general`

## Goal

Make scene-relevant hits rank above generic hits when possible, while keeping the whole system local-first and backwards-compatible.
