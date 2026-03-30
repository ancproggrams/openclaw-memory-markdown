import fs from 'node:fs/promises';
import path from 'node:path';

const COMPONENT = 'marq-memory';
const EVENT_STATUSES = new Set(['ok', 'info', 'warn', 'error']);

function opsDir(cfg) {
  return path.join(cfg.workspaceRoot, 'ops');
}

export function memoryObservabilityPath(cfg) {
  return path.join(opsDir(cfg), 'memory-observability.jsonl');
}

export function agentRunsPath(cfg) {
  return path.join(opsDir(cfg), 'agent-runs.jsonl');
}

export function cronRunsPath(cfg) {
  return path.join(opsDir(cfg), 'cron-runs.jsonl');
}

async function ensureSidecar(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, '');
}

export async function ensureObservabilitySidecars(cfg) {
  await Promise.all([
    ensureSidecar(memoryObservabilityPath(cfg)),
    ensureSidecar(agentRunsPath(cfg)),
    ensureSidecar(cronRunsPath(cfg)),
  ]);
}

export function normalizeEvent(input = {}) {
  const timestamp = input.timestamp || new Date().toISOString();
  const status = EVENT_STATUSES.has(input.status) ? input.status : 'info';
  const details = input.details && typeof input.details === 'object' ? input.details : {};

  return {
    timestamp,
    component: input.component || COMPONENT,
    eventType: input.eventType || 'event',
    status,
    durationMs: Number.isFinite(input.durationMs) ? input.durationMs : null,
    details,
  };
}

export async function appendEvent(filePath, event) {
  await ensureSidecar(filePath);
  await fs.appendFile(filePath, `${JSON.stringify(normalizeEvent(event))}\n`);
}

export async function logMemoryEvent(cfg, event) {
  await appendEvent(memoryObservabilityPath(cfg), event);
}

export async function logTaskEvent(cfg, event) {
  await appendEvent(agentRunsPath(cfg), event);
}

export async function logCronEvent(cfg, event) {
  await appendEvent(cronRunsPath(cfg), event);
}

export async function readJsonlEvents(filePath) {
  await ensureSidecar(filePath);
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function readObservabilityEvents(cfg) {
  await ensureObservabilitySidecars(cfg);
  const [memoryEvents, agentEvents, cronEvents] = await Promise.all([
    readJsonlEvents(memoryObservabilityPath(cfg)),
    readJsonlEvents(agentRunsPath(cfg)),
    readJsonlEvents(cronRunsPath(cfg)),
  ]);

  return { memoryEvents, agentEvents, cronEvents };
}

function startOfWindow(windowDays, now = new Date()) {
  const boundary = new Date(now);
  boundary.setUTCHours(0, 0, 0, 0);
  boundary.setUTCDate(boundary.getUTCDate() - Math.max(0, windowDays - 1));
  return boundary;
}

function withinWindow(events, boundary) {
  return events.filter((event) => {
    const timestamp = new Date(event.timestamp);
    return !Number.isNaN(timestamp.getTime()) && timestamp >= boundary;
  });
}

export function summarizeObservability({ memoryEvents, agentEvents, cronEvents }, options = {}) {
  const windowDays = options.windowDays || 7;
  const boundary = startOfWindow(windowDays, options.now || new Date());
  const scopedMemoryEvents = withinWindow(memoryEvents, boundary);
  const scopedAgentEvents = withinWindow(agentEvents, boundary);
  const scopedCronEvents = withinWindow(cronEvents, boundary);

  const topScenesMap = new Map();
  const recurringFailuresMap = new Map();
  let repeatedTaskPreventedCount = 0;
  let successfulTaskReuseCount = 0;
  let promotionCount = 0;
  let duplicateSkipCount = 0;
  let conflictCount = 0;
  let qualityGateFailureCount = 0;
  let retrievalRequests = 0;
  let retrievalZeroHits = 0;
  let reindexDurationMsTotal = 0;
  let reindexRuns = 0;

  for (const event of scopedAgentEvents) {
    const scene = event.details?.scene || 'general';
    topScenesMap.set(scene, (topScenesMap.get(scene) || 0) + 1);

    if (event.eventType === 'task_skipped_prior_success') repeatedTaskPreventedCount += 1;
    if (event.eventType === 'task_completed' && event.details?.reusable) successfulTaskReuseCount += 1;
    if (event.eventType === 'task_failed') {
      const key = event.details?.taskFingerprint || event.details?.taskDescription || 'unknown-task';
      recurringFailuresMap.set(key, (recurringFailuresMap.get(key) || 0) + 1);
    }
  }

  for (const event of scopedMemoryEvents) {
    if (event.eventType === 'promotion_run') promotionCount += Number(event.details?.promotedCount || 0);
    if (event.eventType === 'dedup_skip') duplicateSkipCount += 1;
    if (event.eventType === 'promotion_conflict') conflictCount += 1;
    if (event.eventType === 'quality_gate_completed' && event.status !== 'ok') qualityGateFailureCount += 1;
    if (event.eventType === 'reindex_completed') {
      reindexRuns += 1;
      if (Number.isFinite(event.durationMs)) reindexDurationMsTotal += event.durationMs;
    }
    if (event.eventType === 'memory_search') {
      retrievalRequests += 1;
      if ((event.details?.resultCount || 0) === 0) retrievalZeroHits += 1;
    }
  }

  for (const event of scopedCronEvents) {
    if (event.eventType === 'cron_failed') {
      const key = event.details?.job || 'unknown-cron';
      recurringFailuresMap.set(key, (recurringFailuresMap.get(key) || 0) + 1);
    }
  }

  const topScenes = [...topScenesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([scene, count]) => ({ scene, count }));

  const recurringFailures = [...recurringFailuresMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({ key, count }));

  return {
    windowDays,
    totalTaskEvents: scopedAgentEvents.length,
    totalMemoryEvents: scopedMemoryEvents.length,
    totalCronEvents: scopedCronEvents.length,
    repeatedTaskPreventedCount,
    successfulTaskReuseCount,
    promotionCount,
    duplicateSkipCount,
    conflictCount,
    qualityGateFailureCount,
    retrievalZeroHitRate: retrievalRequests ? Number((retrievalZeroHits / retrievalRequests).toFixed(3)) : 0,
    averageReindexDurationMs: reindexRuns ? Math.round(reindexDurationMsTotal / reindexRuns) : 0,
    topScenes,
    recurringFailures,
  };
}

export async function getMemoryHealthSummary(cfg, options = {}) {
  const events = await readObservabilityEvents(cfg);
  return summarizeObservability(events, options);
}
