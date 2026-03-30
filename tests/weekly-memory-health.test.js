import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import { sceneRecall } from '../src/scene-recall.js';

test('scene recall ranks scene and project matches above generic hits', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-scene-recall-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory', includeDocs: true });

  await fs.mkdir(path.join(root, 'memory', 'deployment'), { recursive: true });
  await fs.mkdir(path.join(root, 'docs'), { recursive: true });
  await fs.writeFile(path.join(root, 'MEMORY.md'), 'General notes about ports and health checks.\n');
  await fs.writeFile(path.join(root, 'MEMORY_PREFERENCES.md'), '');
  await fs.writeFile(path.join(root, 'KNOWLEDGE_FACTS.md'), '');
  await fs.writeFile(path.join(root, 'memory', 'deployment', 'service-desk-openclaw.md'), 'deployment service-desk-openclaw port collision docker compose fix\n');
  await fs.writeFile(path.join(root, 'docs', 'generic-ports.md'), 'port collision notes for many apps\n');

  const result = await sceneRecall(cfg, {
    query: 'port collision docker',
    scene: 'deployment',
    project: 'service-desk-openclaw',
    maxResults: 5,
  });

  assert.equal(result.scene, 'deployment');
  assert.equal(result.results[0].path, 'memory/deployment/service-desk-openclaw.md');
  assert.ok(result.results[0].score > result.results[1].score);
});
