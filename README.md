# Marq Memory

**Marq Memory** is a markdown-first memory plugin for OpenClaw.

It packages a simple but practical memory architecture that is easy to inspect, easy to back up, and easy to understand.

Instead of hiding memory in an opaque database, it treats markdown files as the source of truth.

## Why this plugin exists

A lot of memory systems optimize for automation first. That sounds good, but it often creates three problems:

1. memory becomes hard to inspect
2. bad writes are hard to undo
3. users stop trusting what the system remembers

Marq Memory takes a different approach.

It starts with a filesystem model that people can read and repair.

## Core idea

The plugin uses **layered memory**.

### Layer 1 — Core memory

Typical files:

- `MEMORY.md`
- `MEMORY_PREFERENCES.md`
- `KNOWLEDGE_FACTS.md`

These hold durable rules, preferences, and verified facts.

### Layer 2 — Daily memory

Typical path:

- `memory/YYYY-MM-DD.md`

This is the append-only chronological log for durable memory capture.

### Layer 3 — Supporting knowledge

Typical paths:

- `memory/**/*.md`
- `memory/facts/**/*.md`
- `docs/**/*.md`

This layer expands recall without bloating the bootstrap files.

## What the plugin does

This release ships three tools:

- `marq_memory_search`
- `marq_memory_append`
- `marq_memory_explain`

### `marq_memory_search`

Searches across configured markdown memory sources and returns the strongest local hits.

### `marq_memory_append`

Appends a durable note to today’s canonical daily memory file.

### `marq_memory_explain`

Explains the active memory layout and config so users can understand how recall is wired.

## Why markdown-first is useful

This design gives users:

- transparent storage
- local-first behavior
- low operational complexity
- easy git history
- safer append-only raw capture
- no required API keys
- no required embeddings for the base version

## Current implementation scope

This is a **clean starter plugin** designed to be understandable and publishable.

Current implementation choices:

- local file collection via glob patterns
- lightweight term-based ranking
- append-only writes to daily notes
- config-driven recall surface

It does **not** yet include:

- semantic embeddings
- graph memory
- clustering
- automatic promotion jobs
- prompt auto-injection hooks

Those are good next steps, but the base package intentionally keeps the architecture legible.

## Installation

```bash
npm install
```

Then configure the plugin in OpenClaw and point `workspaceRoot` to the right folder.

See `examples/openclaw.config.example.json`.

## Configuration

### `workspaceRoot`

The root folder where memory files live.

### `memoryDir`

The folder used for daily append-only memory notes.

### `coreFiles`

The compact durable memory files.

### `factsGlobs`

Additional markdown memory and fact files to search.

### `includeDocs`

Whether to include docs in the search surface.

### `docsGlobs`

Glob patterns for docs that should be searchable.

### `maxFileBytes`

Large files are skipped to keep search predictable.

### `dailyWriteMode`

Currently fixed to `append-only`.

## Recommended use cases

This plugin is a strong fit for:

- personal assistants
- operators who want auditable memory
- markdown-heavy workspaces
- local-first OpenClaw setups
- people who prefer inspectable recall over black-box memory mutation

## Roadmap

Planned next-step improvements:

1. semantic search mode
2. recency weighting / temporal decay
3. promotion pipeline from daily notes to curated memory
4. deduplication for durable facts
5. optional graph links between problem, fix, and outcome
6. optional auto-recall hooks

## Verification

Basic tests are included with Node’s built-in test runner.

```bash
npm test
```

## Publishing

This package is structured to be easier to publish to npm or ClawHub:

- manifest included
- package metadata cleaned up
- docs split into focused files
- tests included
- packaged files allowlisted

See `docs/PUBLISHING.md`.

## Philosophy

This plugin is built around one principle:

**memory should be trustworthy before it becomes clever.**
