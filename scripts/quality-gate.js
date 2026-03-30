#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveConfig, searchMemory, todayStamp } from '../src/core.js';

async function main() {
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  const day = process.argv[2] || todayStamp();
  const dailyPath = path.join(cfg.workspaceRoot, cfg.memoryDir, `${day}.md`);
  const content = await fs.readFile(dailyPath, 'utf8').catch(() => '');
  const checks = {
    dailyExists: Boolean(content.trim()),
    hasTypedEntries: /\[(mem|fact|obs)\]/.test(content),
    memorySearchHealthy: false,
  };

  const probe = await searchMemory(cfg, day, 3).catch(() => []);
  checks.memorySearchHealthy = Array.isArray(probe);

  const ok = checks.dailyExists && checks.memorySearchHealthy;
  console.log(JSON.stringify({ ok, day, checks }, null, 2));
  if (!ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
