# Observability

Marq Memory v0.5 adds a local-first observability foundation built on append-only JSONL sidecars.

## Sidecar logs

All logs live under `ops/` and are created lazily:

- `ops/memory-observability.jsonl`
- `ops/agent-runs.jsonl`
- `ops/cron-runs.jsonl`
- `ops/marq-memory-weekly-report.md`

## Event categories

### Memory events

Examples:

- `memory_append`
- `memory_search`
- `promotion_run`
- `quality_gate_completed`
- `reindex_completed`
- `weekly_health_report_generated`

### Agent / task events

Examples:

- `task_started`
- `task_completed`
- `task_failed`
- `task_skipped_prior_success`
- `task_resumed`

### Cron events

Examples:

- `cron_completed`
- `cron_failed`

## Event shape

Each line is one JSON object:

```json
{
  "timestamp": "2026-03-30T19:45:00.000Z",
  "component": "marq-memory",
  "eventType": "quality_gate_completed",
  "status": "ok",
  "durationMs": 152,
  "details": {
    "day": "2026-03-30",
    "dailyExists": true
  }
}
```

## Weekly report

Generate the weekly summary with:

```bash
npm run memory:weekly-health
```

This writes `ops/marq-memory-weekly-report.md` with a compact markdown review of:

- total task activity
- duplicate tasks prevented
- top scenes
- recurring failures
- promotions
- conflicts
- quality-gate drift
- retrieval zero-hit rate
