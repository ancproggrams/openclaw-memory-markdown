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

## Recommended note style

Examples:

```text
[mem] 2026-03-30 durable decision about workflow
[fact] 2026-03-30 system fact with stable value
[obs] 2026-03-30 observed retrieval issue and likely cause
```
