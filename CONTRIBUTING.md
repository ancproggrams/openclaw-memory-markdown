# Contributing

Thanks for contributing to Marq Memory.

## Principles

Keep the plugin:

- readable
- local-first
- transparent
- append-only for raw memory writes
- easy to test and reason about

## Workflow

1. Keep PRs focused
2. Use conventional commits where possible
3. Run:

```bash
npm test
npm pack --dry-run
```

4. Document any AI-assisted code in the PR description
5. Explain what changed and why

## Near-term roadmap

- semantic retrieval
- temporal decay
- promotion pipeline
- optional graph relations
- auto-recall hooks
