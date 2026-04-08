import { searchMemory } from './core.js';
import { searchArchive, ingestArchive } from './archive.js';
import { procedureRecall, isTaskLikeQuery } from './procedure-recall.js';
import { sceneRecall } from './scene-recall.js';
import { inferScene } from './fingerprint.js';

function isHistoricalQuery(query = '') {
  const lower = String(query).toLowerCase();
  return /(waarom|wanneer|eerder|vorige|historie|historisch|context|decision|decide|why|when|earlier|history|previous|what did we decide|hoe kwamen we)/.test(lower);
}

export async function unifiedRecall(cfg, input) {
  const query = String(input.query || '');
  const scene = inferScene(query, input.scene);
  const project = input.project || null;
  const taskLike = input.taskLike ?? isTaskLikeQuery(query);
  const historical = input.historical ?? isHistoricalQuery(query);
  const maxResults = input.maxResults || 5;

  const canonical = taskLike
    ? await procedureRecall(cfg, { query, scene, project, taskLike, maxResults })
    : await sceneRecall(cfg, { query, scene, project, taskLike, maxResults });

  const archive = historical || input.includeArchive
    ? await searchArchive(cfg, { query, scene, project, maxResults })
    : { query, scene, project, results: [] };

  return {
    query,
    scene,
    project,
    taskLike,
    historical,
    policy: {
      canonicalFirst: true,
      archiveSupplemental: true,
      archiveQueried: historical || Boolean(input.includeArchive),
    },
    canonical: canonical.results,
    archive: archive.results,
  };
}

export async function ingestSessionArchive(cfg, input) {
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const title = input.title || input.sessionId || 'OpenClaw session archive';
  return ingestArchive(cfg, {
    archiveId: input.archiveId || input.sessionId,
    title,
    messages,
    kind: input.kind || 'session',
    source: input.source || 'openclaw-session',
    project: input.project,
    scene: input.scene,
    participants: input.participants,
    createdAt: input.createdAt,
  });
}
