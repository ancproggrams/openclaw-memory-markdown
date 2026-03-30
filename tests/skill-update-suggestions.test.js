import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import { procedureMarkdownPath, promoteProcedureCandidatesToMarkdown } from '../src/procedures.js';
import { generateSkillUpdateSuggestions, listSkillUpdateSuggestions, skillUpdateSuggestionPath } from '../src/skill-update-suggestions.js';
import { writeTaskRecord } from '../src/task-memory.js';

test('generates additive skill update suggestions from promoted stable procedures', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-skill-suggestions-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory' });

  for (const summary of [
    'Recovered deployment and health check passed.',
    'Deployment repeated cleanly with docker compose.',
    'Deployment repeated again and verification passed.',
  ]) {
    await writeTaskRecord(cfg, {
      taskDescription: 'Deploy backend via docker compose',
      scene: 'deployment',
      project: 'service-desk-openclaw',
      taskType: 'deployment-runbook',
      status: 'success',
      summary,
      reusable: true,
      artifacts: ['deploy.log'],
      verification: { type: 'health-check', result: 'passed' },
    });
  }

  const promoted = await promoteProcedureCandidatesToMarkdown(cfg);
  assert.equal(promoted.promotedCount, 1);
  const markdown = await fs.readFile(procedureMarkdownPath(cfg, 'deployment'), 'utf8');
  assert.match(markdown, /Deploy backend via docker compose/);

  const generated = await generateSkillUpdateSuggestions(cfg);
  assert.equal(generated.created, 1);
  assert.equal(generated.path, 'memory/skill-update-suggestions.jsonl');
  assert.match(generated.suggestions[0].targetSkill, /service-desk-openclaw-deployment/);
  assert.equal(generated.suggestions[0].status, 'pending-review');

  const listed = await listSkillUpdateSuggestions(cfg, { status: 'pending-review' });
  assert.equal(listed.total, 1);
  assert.equal(listed.suggestions[0].candidateId.startsWith('proc_'), true);

  const second = await generateSkillUpdateSuggestions(cfg);
  assert.equal(second.created, 0);

  const stat = await fs.stat(skillUpdateSuggestionPath(cfg));
  assert.ok(stat.isFile());
});

test('does not generate suggestions for unpromoted procedures unless explicitly allowed', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-skill-suggestions-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory' });

  for (const summary of [
    'Debugged the worker timeout and confirmed recovery.',
    'Repeated the timeout fix and verified queue drain.',
    'Ran the fix again and all checks passed.',
  ]) {
    await writeTaskRecord(cfg, {
      taskDescription: 'Fix worker timeout in queue processor',
      scene: 'debugging',
      project: 'ops-console',
      taskType: 'debug-runbook',
      status: 'success',
      summary,
      reusable: true,
    });
  }

  const defaultGeneration = await generateSkillUpdateSuggestions(cfg);
  assert.equal(defaultGeneration.created, 0);

  const allowedGeneration = await generateSkillUpdateSuggestions(cfg, { requirePromoted: false });
  assert.equal(allowedGeneration.created, 1);
});
