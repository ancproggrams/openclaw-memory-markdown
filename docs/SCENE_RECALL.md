# Scene-aware Recall

Marq Memory scene-aware recall improves ranking without replacing the existing markdown search layer.

## Tool

Use `marq_scene_recall` with:

- `query`
- optional `scene`
- optional `project`
- optional `maxResults`

## Ranking inputs

Results are ranked using a blend of:

1. term match score from the markdown content
2. explicit or inferred scene
3. project matches in path or content
4. path hints from the memory/docs structure

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
