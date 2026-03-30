#!/usr/bin/env node
import { collectFiles, resolveConfig, todayStamp } from '../src/core.js';
import { logCronEvent, logMemoryEvent } from '../src/observability.js';

async function main() {
  const startedAt = Date.now();
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  const files = await collectFiles(cfg);
  const durationMs = Date.now() - startedAt;

  await logMemoryEvent(cfg, {
    eventType: 'reindex_completed',
    status: 'ok',
    durationMs,
    details: {
      indexedFiles: files.length,
      mode: 'filesystem-scan',
    },
  });

  await logCronEvent(cfg, {
    eventType: 'cron_completed',
    status: 'ok',
    durationMs,
    details: {
      job: 'memory:reindex',
      indexedFiles: files.length,
    },
  });

  console.log(JSON.stringify({
    ok: true,
    runAt: new Date().toISOString(),
    day: todayStamp(),
    indexedFiles: files.length,
    mode: 'filesystem-scan',
  }, null, 2));
}

main().catch(async (error) => {
  const cfg = resolveConfig({ workspaceRoot: process.env.MARQ_MEMORY_ROOT || process.cwd() });
  await logCronEvent(cfg, {
    eventType: 'cron_failed',
    status: 'error',
    details: {
      job: 'memory:reindex',
      message: error.message,
    },
  }).catch(() => {});
  console.error(error);
  process.exit(1);
});
