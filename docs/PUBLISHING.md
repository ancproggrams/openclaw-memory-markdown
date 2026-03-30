# Publishing

## Goal

This package is structured as a cleaner ClawHub/npm-ready plugin starter.

## Before publishing publicly

Recommended finishing steps:

1. Replace placeholder repository URLs with the real repository
2. Test installation in a clean OpenClaw environment
3. Add screenshots or usage examples if publishing to a public registry
4. Add changelog entries
5. Optionally add semantic search mode as a second release

## Suggested release message

> Marq Memory is a markdown-first OpenClaw memory plugin that favors inspectability, append-only safety, and layered filesystem truth over opaque memory mutation.

## Verification commands

```bash
npm test
npm pack --dry-run
```

## Release hygiene

- keep PRs focused
- use conventional commits
- document AI-assisted code if applicable
- include test commands in the PR description
