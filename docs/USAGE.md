# Usage

## Tool: `marq_memory_search`

Searches configured markdown sources.

Example:

```json
{
  "query": "continuity plan",
  "maxResults": 5
}
```

## Tool: `marq_memory_append`

Appends a durable note to today’s daily file.

Example:

```json
{
  "text": "[mem] 2026-03-30 created publishable starter plugin for markdown-first memory"
}
```

## Tool: `marq_memory_explain`

Returns the active layout and config summary.

Useful for onboarding, support, and debugging.

## Tool: `marq_task_check`

Checks the operational task sidecar for similar prior work.

Example:

```json
{
  "taskDescription": "deploy backend via docker compose",
  "scene": "deployment",
  "project": "service-desk-openclaw"
}
```

## Tool: `marq_task_write`

Appends a task outcome to `memory/operations/tasks.jsonl`.
Successful repeated writes can also create procedure candidates in `memory/operations/procedure-candidates.jsonl`.

Example:

```json
{
  "taskDescription": "deploy backend via docker compose",
  "scene": "deployment",
  "project": "service-desk-openclaw",
  "status": "success",
  "summary": "Health check passed",
  "reusable": true
}
```

Use `reusable: true` on repeated successful workflows that are likely runbook candidates.

Repeated failed/partial attempts followed by successful reusable runs can also seed lightweight recovery playbook evidence in the promoted procedure markdown.

## Tool: `marq_procedure_recall`

Use this when the query is task-like and you want curated procedures and recovery playbooks to rank above generic notes when possible.

Example:

```json
{
  "query": "how to recover broken docker compose deploy",
  "scene": "deployment",
  "project": "service-desk-openclaw",
  "maxResults": 5
}
```

## Tool: `marq_memory_recall`

Runs unified recall with canonical memory first and archive second when the query is historical or when archive is explicitly requested.

Example:

```json
{
  "query": "waarom kozen we Clerk voor auth",
  "project": "opdrchtn",
  "historical": true,
  "maxResults": 5
}
```

## Tool: `marq_memory_archive_session_ingest`

Ingests a structured session transcript into archival memory.

Example:

```json
{
  "sessionId": "session-123",
  "title": "Auth discussion",
  "messages": [
    { "role": "user", "text": "Waarom kozen we Clerk?" },
    { "role": "assistant", "text": "Omdat OAuth recovery bleef breken." }
  ],
  "project": "opdrchtn"
}
```

## Tool: `marq_skill_update_suggestions`

Generates additive skill-update suggestions from stable procedural memory and returns the current pending-review set.

Example:

```json
{
  "minimumOccurrenceCount": 3,
  "requirePromoted": true,
  "maxResults": 5
}
```

## Script: review procedure candidates

Review pending candidates captured from repeated successful task records:

```bash
npm run memory:review-procedures
```

## Script: promote curated procedure markdown

Promote strong pending candidates into scene-grouped markdown playbooks under `memory/procedures/`:

```bash
npm run memory:promote-procedures
```

Optionally require a higher occurrence threshold:

```bash
node scripts/promote-procedures.js 3
```

## Script: generate skill update suggestions

Generate maintenance suggestions from strong procedures:

```bash
npm run memory:skill-update-suggestions
```

Or require a different stability threshold:

```bash
node scripts/generate-skill-update-suggestions.js 4
```

## Recommended note style

Examples:

```text
[mem] 2026-03-30 durable decision about workflow
[fact] 2026-03-30 system fact with stable value
[obs] 2026-03-30 observed retrieval issue and likely cause
```
