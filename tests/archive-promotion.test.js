import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import { ingestArchive } from '../src/archive.js';
import { extractArchiveCandidates, promoteArchiveCandidates } from '../src/archive-promotion.js';

test('extract archive candidates writes reviewable sidecar entries', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-archive-candidates-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory', includeDocs: false });

  await fs.writeFile(path.join(root, 'MEMORY_PREFERENCES.md'), '');
  await fs.writeFile(path.join(root, 'KNOWLEDGE_FACTS.md'), '');

  await ingestArchive(cfg, {
    title: 'Auth and defaults',
    text: 'Opdrchtn gebruikt Clerk end-to-end voor auth. Vercel is de standaard deploy route voor webprojecten.',
    source: 'test',
    project: 'opdrchtn',
    scene: 'coding',
    archiveId: 'session-candidate',
    createdAt: '2026-04-08T15:25:00.000Z',
  });

  const result = await extractArchiveCandidates(cfg, {});
  assert.equal(result.createdCount >= 1, true);

  const sidecar = await fs.readFile(path.join(root, 'memory/archive/indexes/archive-candidates.jsonl'), 'utf8');
  assert.match(sidecar, /pending-review/);
  assert.match(sidecar, /Clerk|Vercel/);
});

test('promote archive candidates appends canonical markdown with gate checks', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-archive-promote-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory', includeDocs: false });

  await fs.writeFile(path.join(root, 'MEMORY_PREFERENCES.md'), '');
  await fs.writeFile(path.join(root, 'KNOWLEDGE_FACTS.md'), '');

  await ingestArchive(cfg, {
    title: 'Auth decision',
    text: 'Opdrchtn gebruikt Clerk end-to-end voor auth.',
    source: 'test',
    project: 'opdrchtn',
    scene: 'coding',
    archiveId: 'session-promote',
    createdAt: '2026-04-08T15:26:00.000Z',
  });

  await extractArchiveCandidates(cfg, {});
  const promotion = await promoteArchiveCandidates(cfg, { minimumConfidence: 0.65, maxPromotions: 5 });

  assert.equal(promotion.promoted.length >= 1, true);

  const facts = await fs.readFile(path.join(root, 'KNOWLEDGE_FACTS.md'), 'utf8');
  assert.match(facts, /Clerk/);

  const registry = await fs.readFile(path.join(root, 'memory/registry.jsonl'), 'utf8');
  assert.match(registry, /session-promote/);
});
