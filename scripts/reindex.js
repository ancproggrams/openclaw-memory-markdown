#!/usr/bin/env node
import { resolveConfig, collectFiles, todayStamp } from '../src/core.js';

async function main() {
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  const files = await collectFiles(cfg);
  console.log(JSON.stringify({
    ok: true,
    runAt: new Date().toISOString(),
    day: todayStamp(),
    indexedFiles: files.length,
    mode: 'filesystem-scan'
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
