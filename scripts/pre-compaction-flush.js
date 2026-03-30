#!/usr/bin/env node
import { appendDailyMemory, resolveConfig } from '../src/core.js';

async function main() {
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  const text = process.argv.slice(2).join(' ').trim();
  if (!text) {
    console.log(JSON.stringify({ ok: true, message: 'Nothing to flush' }));
    return;
  }
  const result = await appendDailyMemory(cfg, text);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
