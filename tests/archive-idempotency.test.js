import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import { ingestArchive } from '../src/archive.js';

test('ingestArchive is idempotent for the same archive id and content', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-archive-idempotent-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory', includeDocs: false });

  const input = {
    archiveId: 'session-fixed',
    title: 'Fixed session',
    text: 'We decided to keep Clerk as the auth provider.',
    source: 'test',
    project: 'opdrchtn',
    scene: 'coding',
    createdAt: '2026-04-08T15:45:00.000Z',
  };

  const first = await ingestArchive(cfg, input);
  const second = await ingestArchive(cfg, input);

  assert.equal(first.deduped, false);
  assert.equal(second.deduped, true);

  const manifest = await fs.readFile(path.join(root, 'memory/archive/indexes/archive-manifest.jsonl'), 'utf8');
  assert.equal(manifest.trim().split('\n').length, 1);
});
