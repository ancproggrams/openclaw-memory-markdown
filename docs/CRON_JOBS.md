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

Use when:

- before compaction
- after a critical decision
- after deploy/config/tenant/dns/mail changes

## 2. Nightly consolidation job

Purpose:

- promote durable daily `[mem]` and `[fact]` entries into curated memory files

Script:

```bash
npm run memory:consolidate -- 2026-03-30
```

What it does:

- reads `memory/YYYY-MM-DD.md`
- extracts `[mem]` and `[fact]` entries
- appends `[mem]` entries to `MEMORY_PREFERENCES.md`
- appends `[fact]` entries to `KNOWLEDGE_FACTS.md`

Recommended schedule:

- nightly, for example `02:00`

## 3. Quality gate

Purpose:

- check whether memory files exist and recall is still healthy

Script:

```bash
npm run memory:quality-gate -- 2026-03-30
```

Checks currently include:

- daily note exists
- typed entries are present
- search path is operational

Recommended schedule:

- daily, after consolidation

## 4. Reindex / scan job

Purpose:

- refresh the searchable file surface
- verify memory files are still discoverable

Script:

```bash
npm run memory:reindex
```

Recommended schedule:

- every 4 hours

## Suggested cron setup

Example crontab:

```cron
# Reindex every 4 hours
0 */4 * * * cd /path/to/openclaw-memory-markdown && npm run memory:reindex >> logs/memory-reindex.log 2>&1

# Nightly consolidation
0 2 * * * cd /path/to/openclaw-memory-markdown && npm run memory:consolidate -- $(date +\%F) >> logs/memory-consolidate.log 2>&1

# Daily quality gate
15 2 * * * cd /path/to/openclaw-memory-markdown && npm run memory:quality-gate -- $(date +\%F) >> logs/memory-quality.log 2>&1
```

## Operational note

These jobs are intentionally simple in v0.3.

They provide the maintenance shape of the memory system without introducing heavy infrastructure.

Future releases can replace or extend them with:

- semantic dedup
- archive/prune logic
- stronger promotion rules
- direct OpenClaw hooks
