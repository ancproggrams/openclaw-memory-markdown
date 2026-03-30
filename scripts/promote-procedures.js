#!/usr/bin/env node
import { resolveConfig } from '../src/core.js';
import { promoteProcedureCandidatesToMarkdown } from '../src/procedures.js';

async function main() {
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  const minimumOccurrenceCount = Number(process.argv[2] || 2);
  const result = await promoteProcedureCandidatesToMarkdown(cfg, { minimumOccurrenceCount });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
