import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('archive-recent-sessions reprocesses only changed files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-archive-incremental-'));
  const sessionsDir = path.join(root, 'sessions');
  const workspaceRoot = path.join(root, 'workspace');
  await fs.mkdir(sessionsDir, { recursive: true });
  await fs.mkdir(workspaceRoot, { recursive: true });

  const file = path.join(sessionsDir, 'session-1.jsonl');
  await fs.writeFile(file, JSON.stringify({ type: 'message', message: { role: 'user', content: 'Hallo', timestamp: '2026-04-08T13:14:00.000Z' } }) + '\n', 'utf8');

  const scriptPath = path.resolve('scripts/archive-recent-sessions.js');
  await execFileAsync('node', [scriptPath, sessionsDir, workspaceRoot], { cwd: path.resolve('.') });
  const second = await execFileAsync('node', [scriptPath, sessionsDir, workspaceRoot], { cwd: path.resolve('.') });
  const secondParsed = JSON.parse(second.stdout);
  assert.equal(secondParsed.skippedUnchanged, 1);

  await fs.writeFile(file, [
    JSON.stringify({ type: 'message', message: { role: 'user', content: 'Hallo', timestamp: '2026-04-08T13:14:00.000Z' } }),
    JSON.stringify({ type: 'message', message: { role: 'assistant', content: 'Nieuwe inhoud', timestamp: '2026-04-08T13:15:00.000Z' } }),
  ].join('\n') + '\n', 'utf8');

  const third = await execFileAsync('node', [scriptPath, sessionsDir, workspaceRoot], { cwd: path.resolve('.') });
  const thirdParsed = JSON.parse(third.stdout);
  assert.equal(thirdParsed.skippedUnchanged, 0);
  assert.equal(thirdParsed.ingested + thirdParsed.deduped, 1);
});
