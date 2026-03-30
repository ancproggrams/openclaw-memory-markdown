#!/usr/bin/env node
import { resolveConfig } from '../src/core.js';
import { reviewProcedureCandidates } from '../src/procedures.js';

async function main() {
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  const status = process.argv[2] || 'pending-review';
  const result = await reviewProcedureCandidates(cfg, { status: status === 'all' ? undefined : status });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
