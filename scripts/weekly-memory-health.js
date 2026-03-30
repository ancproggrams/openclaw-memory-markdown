#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveConfig } from '../src/core.js';
import { getMemoryHealthSummary, logCronEvent, logMemoryEvent } from '../src/observability.js';
import { readTaskRecords } from '../src/task-memory.js';

function formatList(items, emptyFallback, render) {
  if (!items.length) return `- ${emptyFallback}`;
  return items.map(render).join('\n');
}

async function main() {
  const startedAt = Date.now();
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  const summary = await getMemoryHealthSummary(cfg, { windowDays: 7 });
  const tasks = await readTaskRecords(cfg);
  const boundary = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentTasks = tasks.filter((task) => new Date(task.finishedAt).getTime() >= boundary);
  const totalTasksRecorded = recentTasks.length;
  const staleMemoryCandidates = recentTasks.filter((task) => task.status === 'failed' || task.status === 'partial').length;
  const reportPath = path.join(cfg.workspaceRoot, 'ops', 'marq-memory-weekly-report.md');
  const generatedAt = new Date().toISOString();

  const markdown = `# Marq Memory Weekly Health Report\n\nGenerated: ${generatedAt}\nWindow: last ${summary.windowDays} days\n\n## Summary\n\n- Total tasks recorded: ${totalTasksRecorded}\n- Duplicate tasks prevented: ${summary.repeatedTaskPreventedCount}\n- Successful reusable tasks recorded: ${summary.successfulTaskReuseCount}\n- Promotions made: ${summary.promotionCount}\n- Duplicate skips: ${summary.duplicateSkipCount}\n- Conflicts found: ${summary.conflictCount}\n- Quality gate failures: ${summary.qualityGateFailureCount}\n- Retrieval zero-hit rate: ${summary.retrievalZeroHitRate}\n- Average reindex duration: ${summary.averageReindexDurationMs} ms\n- Stale memory candidates: ${staleMemoryCandidates}\n\n## Top scenes\n\n${formatList(summary.topScenes, 'No scene activity recorded.', ({ scene, count }) => `- ${scene}: ${count}`)}\n\n## Top recurring failures\n\n${formatList(summary.recurringFailures, 'No recurring failures recorded.', ({ key, count }) => `- ${key}: ${count}`)}\n\n## Quality gate and cron activity\n\n- Memory events observed: ${summary.totalMemoryEvents}\n- Agent events observed: ${summary.totalTaskEvents}\n- Cron events observed: ${summary.totalCronEvents}\n`;

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, markdown);

  const durationMs = Date.now() - startedAt;
  await logMemoryEvent(cfg, {
    eventType: 'weekly_health_report_generated',
    status: 'ok',
    durationMs,
    details: {
      path: 'ops/marq-memory-weekly-report.md',
      totalTasksRecorded,
      staleMemoryCandidates,
    },
  });
  await logCronEvent(cfg, {
    eventType: 'cron_completed',
    status: 'ok',
    durationMs,
    details: {
      job: 'memory:weekly-health',
      path: 'ops/marq-memory-weekly-report.md',
    },
  });

  console.log(JSON.stringify({ ok: true, path: 'ops/marq-memory-weekly-report.md', summary }, null, 2));
}

main().catch(async (error) => {
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  await logCronEvent(cfg, {
    eventType: 'cron_failed',
    status: 'error',
    details: {
      job: 'memory:weekly-health',
      message: error.message,
    },
  }).catch(() => {});
  console.error(error);
  process.exit(1);
});
