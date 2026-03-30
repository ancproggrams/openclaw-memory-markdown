import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import {
  captureProcedureCandidates,
  procedureCandidateStorePath,
  procedureMarkdownPath,
  promoteProcedureCandidatesToMarkdown,
  readProcedureCandidates,
} from '../src/procedures.js';
import { writeTaskRecord } from '../src/task-memory.js';

test('captures a procedure candidate after repeated successful task records', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-procedures-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory' });

  const first = await writeTaskRecord(cfg, {
    taskDescription: 'Deploy backend via docker compose',
    project: 'service-desk-openclaw',
    taskType: 'deployment-runbook',
    status: 'success',
    summary: 'Backend deployed and health check passed.',
    reusable: true,
    artifacts: ['deploy.log'],
    verification: { type: 'health-check', result: 'passed' },
  });

  assert.equal(first.procedureCandidates.created, 0);

  const second = await writeTaskRecord(cfg, {
    taskDescription: 'Deploy backend via docker compose',
    project: 'service-desk-openclaw',
    taskType: 'deployment-runbook',
    status: 'success',
    summary: 'Repeat deployment succeeded cleanly.',
    reusable: true,
    artifacts: ['deploy.log', 'health.txt'],
    verification: { type: 'health-check', result: 'passed' },
  });

  assert.equal(second.procedureCandidates.created, 1);
  assert.equal(second.procedureCandidates.path, 'memory/operations/procedure-candidates.jsonl');

  const candidates = await readProcedureCandidates(cfg);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].taskFingerprint, 'deploy|backend|docker-compose');
  assert.equal(candidates[0].occurrenceCount, 2);
  assert.equal(candidates[0].status, 'pending-review');
  assert.equal(candidates[0].project, 'service-desk-openclaw');

  const thirdCapture = await captureProcedureCandidates(cfg);
  assert.equal(thirdCapture.created, 0);

  const stat = await fs.stat(procedureCandidateStorePath(cfg));
  assert.ok(stat.isFile());
});

test('does not create procedure candidates for failed, non-reusable, or one-off tasks', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-procedures-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory' });

  await writeTaskRecord(cfg, {
    taskDescription: 'Fix login stacktrace in production',
    status: 'failed',
    summary: 'Patch failed validation.',
  });

  await writeTaskRecord(cfg, {
    taskDescription: 'Fix login stacktrace in production',
    status: 'success',
    reusable: false,
    summary: 'Patched once but not enough repetition yet.',
  });

  await writeTaskRecord(cfg, {
    taskDescription: 'Fix login stacktrace in production',
    status: 'success',
    reusable: false,
    summary: 'Patched twice but not explicitly reusable.',
  });

  const candidates = await readProcedureCandidates(cfg);
  assert.equal(candidates.length, 0);
});

test('promotes strong procedure candidates into scene-grouped markdown playbooks', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-procedures-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory' });

  await writeTaskRecord(cfg, {
    taskDescription: 'Deploy backend via docker compose',
    scene: 'deployment',
    project: 'service-desk-openclaw',
    taskType: 'deployment-runbook',
    status: 'success',
    summary: 'Backend deployed and health check passed.',
    reusable: true,
    artifacts: ['deploy.log'],
    verification: { type: 'health-check', result: 'passed' },
  });

  await writeTaskRecord(cfg, {
    taskDescription: 'Deploy backend via docker compose',
    scene: 'deployment',
    project: 'service-desk-openclaw',
    taskType: 'deployment-runbook',
    status: 'success',
    summary: 'Repeat deployment succeeded cleanly.',
    reusable: true,
    artifacts: ['deploy.log', 'health.txt'],
    verification: { type: 'health-check', result: 'passed' },
  });

  const firstPromotion = await promoteProcedureCandidatesToMarkdown(cfg);
  assert.equal(firstPromotion.promotedCount, 1);
  assert.equal(firstPromotion.promoted[0].path, 'memory/procedures/deployment.md');

  const markdownPath = procedureMarkdownPath(cfg, 'deployment');
  const markdown = await fs.readFile(markdownPath, 'utf8');
  assert.match(markdown, /# Deployment Procedures/);
  assert.match(markdown, /## Deploy backend via docker compose/);
  assert.match(markdown, /Observed successes:\*\* 2/);
  assert.match(markdown, /health-check/);
  assert.match(markdown, /deploy\.log/);

  const candidateRecords = await readProcedureCandidates(cfg);
  const latest = candidateRecords.at(-1);
  assert.equal(latest.status, 'promoted');
  assert.equal(latest.promotedTo, 'memory/procedures/deployment.md');

  const secondPromotion = await promoteProcedureCandidatesToMarkdown(cfg);
  assert.equal(secondPromotion.promotedCount, 0);
  assert.equal(secondPromotion.skippedCount, 0);

  const markdownAgain = await fs.readFile(markdownPath, 'utf8');
  const headingCount = (markdownAgain.match(/## Deploy backend via docker compose/g) || []).length;
  assert.equal(headingCount, 1);
});

test('captures recovery playbook evidence when repeated failures are followed by successful recoveries', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-procedure-recovery-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory' });

  await writeTaskRecord(cfg, {
    taskDescription: 'Recover docker compose deployment',
    scene: 'deployment',
    project: 'service-desk-openclaw',
    taskType: 'deployment-runbook',
    status: 'failed',
    summary: 'Deploy failed because port 8080 was still occupied.',
  });

  await writeTaskRecord(cfg, {
    taskDescription: 'Recover docker compose deployment',
    scene: 'deployment',
    project: 'service-desk-openclaw',
    taskType: 'deployment-runbook',
    status: 'success',
    summary: 'Recovered by stopping the old container and rerunning docker compose up.',
    reusable: true,
    verification: { type: 'health-check', result: 'passed' },
  });

  await writeTaskRecord(cfg, {
    taskDescription: 'Recover docker compose deployment',
    scene: 'deployment',
    project: 'service-desk-openclaw',
    taskType: 'deployment-runbook',
    status: 'failed',
    summary: 'Deploy failed again because the stale network was left behind.',
  });

  const finalWrite = await writeTaskRecord(cfg, {
    taskDescription: 'Recover docker compose deployment',
    scene: 'deployment',
    project: 'service-desk-openclaw',
    taskType: 'deployment-runbook',
    status: 'success',
    summary: 'Recovered by pruning the stale network and rerunning docker compose.',
    reusable: true,
    verification: { type: 'health-check', result: 'passed' },
  });

  assert.equal(finalWrite.procedureCandidates.created, 1);

  const firstCandidate = (await readProcedureCandidates(cfg))[0];
  assert.ok(firstCandidate.recoveryPlaybook);
  assert.equal(firstCandidate.recoveryPlaybook.successfulRecoveryCount, 2);
  assert.equal(firstCandidate.recoveryPlaybook.repeatedFailureCount, 2);

  const promoted = await promoteProcedureCandidatesToMarkdown(cfg);
  assert.equal(promoted.promotedCount, 1);

  const markdown = await fs.readFile(procedureMarkdownPath(cfg, 'deployment'), 'utf8');
  assert.match(markdown, /### Recovery playbook/);
  assert.match(markdown, /port 8080 was still occupied/);
  assert.match(markdown, /pruning the stale network/);
});
