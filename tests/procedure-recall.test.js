import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import { procedureRecall } from '../src/procedure-recall.js';
import { sceneRecall } from '../src/scene-recall.js';

test('procedure recall prefers curated procedure markdown for task-like prompts', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-procedure-recall-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory', includeDocs: true });

  await fs.mkdir(path.join(root, 'memory', 'procedures'), { recursive: true });
  await fs.mkdir(path.join(root, 'docs'), { recursive: true });
  await fs.writeFile(path.join(root, 'MEMORY.md'), 'Generic notes about docker and outages.\n');
  await fs.writeFile(path.join(root, 'MEMORY_PREFERENCES.md'), '');
  await fs.writeFile(path.join(root, 'KNOWLEDGE_FACTS.md'), '');
  await fs.writeFile(path.join(root, 'memory', 'procedures', 'deployment.md'), '# Deployment Procedures\n\n## Recover docker compose deploy\n\n### Repeatable flow\n- restart stack\n\n### Recovery playbook\n- **Repeated failures observed:** 2\n- **Successful recoveries observed:** 2\n');
  await fs.writeFile(path.join(root, 'docs', 'generic-docker.md'), 'docker compose reference and generic commands\n');

  const result = await procedureRecall(cfg, {
    query: 'how to recover broken docker compose deploy',
    scene: 'deployment',
    maxResults: 5,
  });

  assert.equal(result.taskLike, true);
  assert.equal(result.results[0].path, 'memory/procedures/deployment.md');
  assert.equal(result.results[0].sourceType, 'procedure');
});

test('scene recall boosts procedures for task-like recovery queries', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'marq-scene-procedure-recall-'));
  const cfg = resolveConfig({ workspaceRoot: root, memoryDir: 'memory', includeDocs: true });

  await fs.mkdir(path.join(root, 'memory', 'procedures'), { recursive: true });
  await fs.writeFile(path.join(root, 'MEMORY.md'), 'docker deploy notes\n');
  await fs.writeFile(path.join(root, 'MEMORY_PREFERENCES.md'), '');
  await fs.writeFile(path.join(root, 'KNOWLEDGE_FACTS.md'), '');
  await fs.writeFile(path.join(root, 'memory', 'procedures', 'deployment.md'), 'docker deployment recovery playbook\n');
  await fs.writeFile(path.join(root, 'memory', 'deployment-notes.md'), 'docker deployment notes\n');

  const result = await sceneRecall(cfg, {
    query: 'recover docker deployment',
    scene: 'deployment',
    maxResults: 5,
  });

  assert.equal(result.taskLike, true);
  assert.equal(result.results[0].path, 'memory/procedures/deployment.md');
});
