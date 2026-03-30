import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { appendDailyMemory, resolveConfig, searchMemory, splitSnippet, todayStamp } from '../src/core.js';

test('todayStamp returns YYYY-MM-DD', () => {
  assert.equal(todayStamp(new Date('2026-03-30T10:00:00Z')), '2026-03-30');
});

test('splitSnippet returns focused snippet when query exists', () => {
  const text = 'alpha beta gamma delta epsilon zeta eta theta';
  const snippet = splitSnippet(text, 'delta', 40);
  assert.match(snippet, /delta/);
});

test('appendDailyMemory appends to canonical daily file', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-memory-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory' });
  await appendDailyMemory(cfg, '[mem] hello', new Date('2026-03-30T10:00:00Z'));
  await appendDailyMemory(cfg, '[fact] world', new Date('2026-03-30T12:00:00Z'));
  const content = await fs.readFile(path.join(root, 'memory/2026-03-30.md'), 'utf8');
  assert.match(content, /\[mem\] hello/);
  assert.match(content, /\[fact\] world/);
});

test('searchMemory returns relevant markdown hits', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-memory-'));
  await fs.mkdir(path.join(root, 'memory'), { recursive: true });
  await fs.writeFile(path.join(root, 'MEMORY.md'), 'Substack drafts and project continuity plan');
  await fs.writeFile(path.join(root, 'memory/2026-03-30.md'), '[mem] working on plugin packaging');
  const cfg = resolveConfig({ workspaceRoot: root, includeDocs: false });
  const results = await searchMemory(cfg, 'Substack continuity', 5);
  assert.equal(results.length, 1);
  assert.equal(results[0].path, 'MEMORY.md');
});
