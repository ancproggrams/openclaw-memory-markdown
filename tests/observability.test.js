import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import { conflictsPath, promoteDailyMemory, promotionsPath, readPromotionSidecars, registryPath } from '../src/promotion.js';

test('smart promotion writes promotion, registry, and conflict sidecars', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-promotion-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory' });

  await fs.mkdir(path.join(root, 'memory'), { recursive: true });
  await fs.writeFile(path.join(root, 'memory', '2026-03-30.md'), [
    '[mem] Prefer terse deploy summaries',
    '[mem] Prefer terse deploy summaries',
    '[fact] API base URL is https://api-v2.example.com',
    '[fact] API base URL is https://api-v3.example.com',
    '[obs] One-off note',
  ].join('\n'));
  await fs.writeFile(path.join(root, 'MEMORY_PREFERENCES.md'), '');
  await fs.writeFile(path.join(root, 'KNOWLEDGE_FACTS.md'), '[fact] API base URL is https://api-v1.example.com\n');

  const result = await promoteDailyMemory(cfg, { day: '2026-03-30', mode: 'smart' });
  const sidecars = await readPromotionSidecars(cfg);
  const prefs = await fs.readFile(path.join(root, 'MEMORY_PREFERENCES.md'), 'utf8');

  assert.equal(result.promoted.length, 1);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.conflicts.length, 2);
  assert.equal(result.skipped.length, 1);
  assert.match(prefs, /Prefer terse deploy summaries/);
  assert.equal(sidecars.promotions.length, 4);
  assert.equal(sidecars.conflicts.length, 2);
  assert.equal(sidecars.registry.length, 1);

  await fs.access(promotionsPath(cfg));
  await fs.access(conflictsPath(cfg));
  await fs.access(registryPath(cfg));
});
