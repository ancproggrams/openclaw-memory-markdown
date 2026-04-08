import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import { ingestArchive } from '../src/archive.js';
import { unifiedRecall, ingestSessionArchive } from '../src/recall.js';

test('unified recall returns canonical first and archive for historical queries', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-unified-recall-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory', includeDocs: false });

  await fs.mkdir(path.join(root, 'memory', 'procedures'), { recursive: true });
  await fs.writeFile(path.join(root, 'MEMORY.md'), 'General auth notes\n');
  await fs.writeFile(path.join(root, 'MEMORY_PREFERENCES.md'), '');
  await fs.writeFile(path.join(root, 'KNOWLEDGE_FACTS.md'), 'Opdrchtn gebruikt Clerk end-to-end voor auth.\n');
  await fs.writeFile(path.join(root, 'memory', 'procedures', 'coding.md'), 'auth implementation procedure\n');

  await ingestArchive(cfg, {
    title: 'Auth decision history',
    text: 'We chose Clerk because the old OAuth recovery flow kept breaking during support incidents.',
    source: 'test',
    project: 'opdrchtn',
    scene: 'coding',
    archiveId: 'session-history',
    createdAt: '2026-04-08T15:30:00.000Z',
  });

  const result = await unifiedRecall(cfg, {
    query: 'waarom kozen we Clerk voor auth',
    project: 'opdrchtn',
    historical: true,
    maxResults: 5,
  });

  assert.equal(result.policy.canonicalFirst, true);
  assert.equal(result.canonical.length > 0, true);
  assert.equal(result.archive.length > 0, true);
  assert.equal(result.archive[0].archiveId, 'session-history');
});

test('session archive ingest stores structured message transcripts', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-session-ingest-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory', includeDocs: false });

  const result = await ingestSessionArchive(cfg, {
    sessionId: 'session-structured',
    title: 'Structured session',
    project: 'openclaw-memory-markdown',
    messages: [
      { role: 'user', text: 'Bekijk mempalace en vergelijk het.', timestamp: '2026-04-08T13:14:00.000Z' },
      { role: 'assistant', text: 'Het huidige systeem is sterker als canonieke truth layer.', timestamp: '2026-04-08T13:15:00.000Z' },
    ],
  });

  assert.equal(result.archiveId, 'session-structured');

  const markdown = await fs.readFile(path.join(root, result.markdownPath), 'utf8');
  assert.match(markdown, /USER/);
  assert.match(markdown, /ASSISTANT/);
});
