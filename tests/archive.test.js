import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import { ingestArchive, searchArchive } from '../src/archive.js';

test('archive ingest writes session artifacts, chunks, and manifest', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-archive-ingest-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory', includeDocs: false });

  const result = await ingestArchive(cfg, {
    title: 'Auth migration discussion',
    text: 'We decided to migrate auth to Clerk because the previous setup caused repeated OAuth issues.',
    source: 'test',
    project: 'opdrchtn',
    scene: 'coding',
    participants: ['Marc', 'Marq'],
    createdAt: '2026-04-08T15:18:00.000Z',
    archiveId: 'session-abc123',
  });

  assert.equal(result.ok, true);
  assert.equal(result.archiveId, 'session-abc123');

  const jsonPath = path.join(root, result.sessionPath);
  const mdPath = path.join(root, result.markdownPath);
  const chunkPath = path.join(root, result.chunkPath);
  const manifestPath = path.join(root, 'memory/archive/indexes/archive-manifest.jsonl');

  const [jsonStat, mdStat, chunkStat, manifestStat] = await Promise.all([
    fs.stat(jsonPath),
    fs.stat(mdPath),
    fs.stat(chunkPath),
    fs.stat(manifestPath),
  ]);

  assert.equal(jsonStat.isFile(), true);
  assert.equal(mdStat.isFile(), true);
  assert.equal(chunkStat.isFile(), true);
  assert.equal(manifestStat.isFile(), true);

  const chunkContent = await fs.readFile(chunkPath, 'utf8');
  assert.match(chunkContent, /Clerk/);
});

test('archive search returns scene/project-aware historical results', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-archive-search-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory', includeDocs: false });

  await ingestArchive(cfg, {
    title: 'Auth migration discussion',
    text: 'We switched to Clerk for auth because OAuth recovery kept breaking.',
    source: 'test',
    project: 'opdrchtn',
    scene: 'coding',
    createdAt: '2026-04-08T15:18:00.000Z',
    archiveId: 'session-auth',
  });

  await ingestArchive(cfg, {
    title: 'Deployment outage',
    text: 'Docker deploy failed and we restored service by restarting the worker and re-running migrations.',
    source: 'test',
    project: 'openclaw-memory-markdown',
    scene: 'deployment',
    createdAt: '2026-04-08T15:19:00.000Z',
    archiveId: 'session-deploy',
  });

  const result = await searchArchive(cfg, {
    query: 'recover docker deploy',
    scene: 'deployment',
    project: 'openclaw-memory-markdown',
    maxResults: 5,
  });

  assert.equal(result.results.length > 0, true);
  assert.equal(result.results[0].archiveId, 'session-deploy');
  assert.equal(result.results[0].scene, 'deployment');
});
