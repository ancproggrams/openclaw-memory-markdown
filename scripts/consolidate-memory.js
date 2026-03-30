#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveConfig, todayStamp } from '../src/core.js';

function extractCandidates(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.startsWith('[fact]') || line.startsWith('[mem]'));
}

async function main() {
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  const day = process.argv[2] || todayStamp();
  const dailyPath = path.join(cfg.workspaceRoot, cfg.memoryDir, `${day}.md`);
  const memoryPath = path.join(cfg.workspaceRoot, 'MEMORY_PREFERENCES.md');
  const factsPath = path.join(cfg.workspaceRoot, 'KNOWLEDGE_FACTS.md');

  const daily = await fs.readFile(dailyPath, 'utf8').catch(() => '');
  if (!daily.trim()) {
    console.log(JSON.stringify({ ok: true, message: 'No daily memory found', day }));
    return;
  }

  const lines = extractCandidates(daily);
  const prefLines = lines.filter((line) => line.startsWith('[mem]'));
  const factLines = lines.filter((line) => line.startsWith('[fact]'));

  if (prefLines.length) {
    await fs.appendFile(memoryPath, `\n## Consolidated ${day}\n${prefLines.join('\n')}\n`);
  }
  if (factLines.length) {
    await fs.appendFile(factsPath, `\n## Consolidated ${day}\n${factLines.join('\n')}\n`);
  }

  console.log(JSON.stringify({
    ok: true,
    day,
    promotedPreferences: prefLines.length,
    promotedFacts: factLines.length,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
