#!/usr/bin/env node
import { resolveConfig, todayStamp } from '../src/core.js';
import { promoteDailyMemory } from '../src/promotion.js';

async function main() {
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  const day = process.argv[2] || todayStamp();
  const result = await promoteDailyMemory(cfg, { day, mode: 'smart' });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
