import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('archive-recent-sessions script ingests jsonl session logs idempotently', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-archive-script-'));
  const sessionsDir = path.join(root, 'sessions');
  const workspaceRoot = path.join(root, 'workspace');
  await fs.mkdir(sessionsDir, { recursive: true });
  await fs.mkdir(workspaceRoot, { recursive: true });

  const sessionLog = [
    JSON.stringify({ type: 'message', message: { role: 'user', content: 'Waarom kozen we Clerk?', timestamp: '2026-04-08T13:14:00.000Z' } }),
    JSON.stringify({ type: 'message', message: { role: 'assistant', content: 'Omdat OAuth recovery bleef breken.', timestamp: '2026-04-08T13:15:00.000Z' } }),
  ].join('\n') + '\n';

  await fs.writeFile(path.join(sessionsDir, 'session-1.jsonl'), sessionLog, 'utf8');

  const scriptPath = path.resolve('scripts/archive-recent-sessions.js');
  const { stdout } = await execFileAsync('node', [scriptPath, sessionsDir, workspaceRoot], {
    cwd: path.resolve('.'),
  });

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.ingested, 1);
  assert.equal(parsed.deduped, 0);
  assert.equal(parsed.skippedUnchanged, 0);

  const second = await execFileAsync('node', [scriptPath, sessionsDir, workspaceRoot], {
    cwd: path.resolve('.'),
  });
  const secondParsed = JSON.parse(second.stdout);
  assert.equal(secondParsed.ingested, 0);
  assert.equal(secondParsed.deduped, 0);
  assert.equal(secondParsed.skippedUnchanged, 1);

  const archiveRoot = path.join(workspaceRoot, 'memory', 'archive', 'conversations', 'sessions');
  const days = await fs.readdir(archiveRoot);
  assert.equal(days.length > 0, true);

  const manifest = await fs.readFile(path.join(workspaceRoot, 'memory', 'archive', 'indexes', 'archive-manifest.jsonl'), 'utf8');
  assert.equal(manifest.trim().split('\n').length, 1);
});
