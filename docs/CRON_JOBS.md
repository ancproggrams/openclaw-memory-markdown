# Cron jobs

Marq Memory is designed to work best with a few recurring maintenance jobs.

These jobs are the operational side of the memory system.

## 1. Pre-compaction flush

Purpose:

- append durable memory before a session compacts or before important context disappears

Script:

```bash
npm run memory:flush -- "[mem] 2026-03-30 important durable note"
```

## 2. Nightly consolidation job

Purpose:

- promote durable daily typed entries into curated memory files
- record promotion decisions into sidecar logs

Script:

```bash
npm run memory:consolidate -- 2026-03-30
```

## 3. Smart promotion job

Purpose:

- run the promotion engine directly and return the full structured result

Script:

```bash
npm run memory:promote-smart -- 2026-03-30
```

## 4. Quality gate

Purpose:

- check whether daily memory exists
- verify typed entries and search path health
- ensure task/promotion sidecars are ready

Script:

```bash
npm run memory:quality-gate -- 2026-03-30
```

## 5. Reindex / scan job

Purpose:

- refresh the searchable file surface
- verify memory files are still discoverable

Script:

```bash
npm run memory:reindex
```

## Suggested cron setup

```cron
0 */4 * * * cd /path/to/openclaw-memory-markdown && npm run memory:reindex >> logs/memory-reindex.log 2>&1
0 2 * * * cd /path/to/openclaw-memory-markdown && npm run memory:consolidate -- $(date +\%F) >> logs/memory-consolidate.log 2>&1
15 2 * * * cd /path/to/openclaw-memory-markdown && npm run memory:quality-gate -- $(date +\%F) >> logs/memory-quality.log 2>&1
```
