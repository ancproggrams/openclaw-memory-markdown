import fs from 'node:fs/promises';
import path from 'node:path';
import { fingerprintTask, inferScene, tokenizeTask } from './fingerprint.js';
import { captureProcedureCandidates, ensureProcedureCandidateSidecar } from './procedures.js';

export const TASK_STATUSES = ['success', 'failed', 'partial', 'cancelled'];

function operationsDir(cfg) {
  return path.join(cfg.workspaceRoot, cfg.memoryDir, 'operations');
}

export function taskStorePath(cfg) {
  return path.join(operationsDir(cfg), 'tasks.jsonl');
}

export function workflowStorePath(cfg) {
  return path.join(operationsDir(cfg), 'workflows.jsonl');
}

async function ensureSidecar(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, '');
}

export async function ensureTaskMemorySidecars(cfg) {
  await Promise.all([
    ensureSidecar(taskStorePath(cfg)),
    ensureSidecar(workflowStorePath(cfg)),
    ensureProcedureCandidateSidecar(cfg),
  ]);
}

async function readJsonl(filePath) {
  await ensureSidecar(filePath);
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function overlapScore(needleTokens, candidateTokens) {
  if (!needleTokens.length || !candidateTokens.length) return 0;
  const candidate = new Set(candidateTokens);
  let matches = 0;
  for (const token of needleTokens) {
    if (candidate.has(token)) matches += 1;
  }
  return matches / Math.max(needleTokens.length, candidateTokens.length);
}

export async function readTaskRecords(cfg) {
  await ensureTaskMemorySidecars(cfg);
  return readJsonl(taskStorePath(cfg));
}

export function buildTaskRecord(input) {
  const finishedAt = input.finishedAt || new Date().toISOString();
  const scene = inferScene(input.taskDescription, input.scene);
  const taskFingerprint = fingerprintTask(input.taskDescription);

  if (!taskFingerprint) throw new Error('taskDescription must produce a non-empty fingerprint');
  if (!TASK_STATUSES.includes(input.status)) throw new Error(`status must be one of: ${TASK_STATUSES.join(', ')}`);
  if (!input.summary || !String(input.summary).trim()) throw new Error('summary is required');

  return {
    taskFingerprint,
    scene,
    project: input.project || null,
    taskType: input.taskType || null,
    status: input.status,
    summary: input.summary,
    startedAt: input.startedAt || finishedAt,
    finishedAt,
    workspace: input.workspace || null,
    artifacts: Array.isArray(input.artifacts) ? input.artifacts : [],
    verification: input.verification || null,
    reusable: Boolean(input.reusable),
    sourceSession: input.sourceSession || null,
    taskDescription: input.taskDescription,
  };
}

export async function writeTaskRecord(cfg, input) {
  const record = buildTaskRecord(input);
  const filePath = taskStorePath(cfg);
  await ensureTaskMemorySidecars(cfg);
  await fs.appendFile(filePath, `${JSON.stringify(record)}\n`);
  const procedureCandidates = record.status === 'success'
    ? await captureProcedureCandidates(cfg)
    : { path: path.join(cfg.memoryDir, 'operations', 'procedure-candidates.jsonl'), created: 0, candidates: [] };
  return {
    path: path.relative(cfg.workspaceRoot, filePath),
    record,
    procedureCandidates,
  };
}

export async function checkTaskMemory(cfg, input) {
  const scene = inferScene(input.taskDescription, input.scene);
  const fingerprint = fingerprintTask(input.taskDescription);
  const needleTokens = tokenizeTask(input.taskDescription);
  const records = await readTaskRecords(cfg);

  const matches = records
    .map((record) => {
      const candidateTokens = tokenizeTask(record.taskDescription || record.taskFingerprint);
      const tokenOverlap = overlapScore(needleTokens, candidateTokens);
      const exactFingerprint = record.taskFingerprint === fingerprint;
      const sameScene = record.scene === scene;
      const sameProject = input.project && record.project === input.project;
      const confidence = Math.min(1, Number(((
        (exactFingerprint ? 0.7 : tokenOverlap * 0.6) +
        (sameScene ? 0.2 : 0) +
        (sameProject ? 0.1 : 0)
      )).toFixed(3)));
      return { ...record, confidence, exactFingerprint, sameScene, sameProject };
    })
    .filter((record) => record.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence || b.finishedAt.localeCompare(a.finishedAt));

  const bestMatch = matches[0] || null;
  const priorStatus = bestMatch?.status || null;
  let recommendation = 'rerun';

  if (bestMatch) {
    if (bestMatch.status === 'success' && bestMatch.confidence >= 0.85) recommendation = bestMatch.reusable ? 'skip' : 'reuse';
    else if (bestMatch.status === 'partial') recommendation = 'resume';
    else if (bestMatch.status === 'failed' && bestMatch.confidence >= 0.5) recommendation = 'rerun';
  }

  return {
    taskFingerprint: fingerprint,
    scene,
    project: input.project || null,
    matched: matches.slice(0, input.maxResults || 5).map((record) => ({
      taskFingerprint: record.taskFingerprint,
      scene: record.scene,
      project: record.project,
      status: record.status,
      summary: record.summary,
      finishedAt: record.finishedAt,
      reusable: record.reusable,
      confidence: record.confidence,
    })),
    recommendation,
    confidence: bestMatch?.confidence || 0,
    priorStatus,
    summary: bestMatch?.summary || null,
  };
}
