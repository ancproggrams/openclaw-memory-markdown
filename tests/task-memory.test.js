import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import { checkTaskMemory, readTaskRecords, taskStorePath, writeTaskRecord, workflowStorePath } from '../src/task-memory.js';

test('task memory write lazily creates sidecar stores and check finds prior success', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-task-memory-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory' });

  const writeResult = await writeTaskRecord(cfg, {
    taskDescription: 'Deploy backend via docker compose',
    project: 'service-desk-openclaw',
    status: 'success',
    summary: 'Backend deployed and health check passed.',
    reusable: true,
    verification: { type: 'health-check', result: 'passed' },
  });

  assert.equal(writeResult.path, 'memory/operations/tasks.jsonl');
  const tasksFile = taskStorePath(cfg);
  const workflowsFile = workflowStorePath(cfg);
  const tasksStat = await fs.stat(tasksFile);
  assert.ok(tasksStat.isFile());
  const workflowsStat = await fs.stat(workflowsFile);
  assert.ok(workflowsStat.isFile());

  const records = await readTaskRecords(cfg);
  assert.equal(records.length, 1);
  assert.equal(records[0].taskFingerprint, 'deploy|backend|docker-compose');
  assert.equal(records[0].scene, 'deployment');

  const check = await checkTaskMemory(cfg, {
    taskDescription: 'deploy the backend with docker-compose',
    scene: 'deployment',
    project: 'service-desk-openclaw',
  });

  assert.equal(check.taskFingerprint, 'deploy|backend|docker-compose');
  assert.equal(check.recommendation, 'skip');
  assert.equal(check.priorStatus, 'success');
  assert.equal(check.matched.length, 1);
  assert.ok(check.confidence >= 0.9);
});

test('task check recommends resume for partial similar task', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-task-memory-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory' });

  await writeTaskRecord(cfg, {
    taskDescription: 'Fix login stacktrace in production',
    status: 'partial',
    summary: 'Root cause found but patch not deployed yet.',
  });

  const check = await checkTaskMemory(cfg, {
    taskDescription: 'fix production login error stacktrace',
  });

  assert.equal(check.scene, 'debugging');
  assert.equal(check.recommendation, 'resume');
  assert.equal(check.priorStatus, 'partial');
});
