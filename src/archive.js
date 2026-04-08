import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { splitSnippet, todayStamp } from './core.js';
import { inferScene, normalizeTaskText } from './fingerprint.js';

function slugifySegment(input = '') {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'archive';
}

function stableContentHash(input) {
  return `sha256:${crypto.createHash('sha256').update(String(input || ''), 'utf8').digest('hex')}`;
}

function chunkText(text, maxChars = 1200, overlap = 200) {
  const value = String(text || '').trim();
  if (!value) return [];
  if (value.length <= maxChars) return [value];
  const chunks = [];
  let start = 0;
  while (start < value.length) {
    const end = Math.min(value.length, start + maxChars);
    chunks.push(value.slice(start, end).trim());
    if (end >= value.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

function renderMessages(messages = []) {
  return messages
    .map((message) => {
      const role = String(message.role || 'unknown').toUpperCase();
      const timestamp = message.timestamp ? ` (${message.timestamp})` : '';
      const text = String(message.text || '').trim();
      return `## ${role}${timestamp}\n\n${text}`;
    })
    .join('\n\n');
}

function scoreText(content, terms) {
  const lower = content.toLowerCase();
  let score = 0;
  for (const term of terms) score += lower.split(term).length - 1;
  return score;
}

async function ensureArchiveDirs(cfg) {
  const roots = [
    path.join(cfg.workspaceRoot, cfg.archiveSessionsDir),
    path.join(cfg.workspaceRoot, cfg.archiveChunksDir),
    path.join(cfg.workspaceRoot, cfg.archiveIndexesDir),
    path.join(cfg.workspaceRoot, cfg.archiveEntityMapsDir),
  ];
  await Promise.all(roots.map((dir) => fs.mkdir(dir, { recursive: true })));
}

async function appendJsonl(filePath, record) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, 'utf8').catch(() => '');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

async function readManifestRecords(cfg) {
  const manifestAbs = path.join(cfg.workspaceRoot, cfg.archiveIndexesDir, 'archive-manifest.jsonl');
  return readJsonl(manifestAbs);
}

function buildDedupeKey({ archiveId, source, contentHash }) {
  return `${archiveId || ''}::${source || ''}::${contentHash || ''}`;
}

export async function ingestArchive(cfg, input) {
  await ensureArchiveDirs(cfg);

  const createdAt = input.createdAt || new Date().toISOString();
  const day = todayStamp(new Date(createdAt));
  const title = String(input.title || 'Untitled archive');
  const kind = String(input.kind || 'session');
  const source = String(input.source || 'manual');
  const project = input.project || null;
  const participants = Array.isArray(input.participants) ? input.participants.map(String) : [];
  const messages = Array.isArray(input.messages) ? input.messages.map((message) => ({
    role: String(message.role || 'unknown'),
    text: String(message.text || ''),
    timestamp: message.timestamp || null,
  })) : null;

  const renderedText = messages && messages.length > 0
    ? renderMessages(messages)
    : String(input.text || '').trim();
  const scene = inferScene(renderedText || title, input.scene);
  const contentHash = stableContentHash(JSON.stringify({ kind, source, title, createdAt, project, scene, participants, messages, text: renderedText }));
  const archiveId = input.archiveId || `${slugifySegment(kind)}-${day}-${contentHash.slice(7, 19)}`;
  const manifestRecords = await readManifestRecords(cfg);
  const dedupeKey = buildDedupeKey({ archiveId, source, contentHash });
  const existing = manifestRecords.find((record) => buildDedupeKey(record) === dedupeKey || (record.archiveId === archiveId && record.source === source));
  if (existing) {
    return {
      ok: true,
      archiveId: existing.archiveId,
      scene: existing.scene || scene,
      project: existing.project || project,
      sessionPath: existing.sessionPath,
      markdownPath: existing.markdownPath,
      chunkPath: existing.chunkPath,
      chunkCount: existing.chunkCount,
      deduped: true,
    };
  }

  const dayDir = path.join(cfg.workspaceRoot, cfg.archiveSessionsDir, day);
  await fs.mkdir(dayDir, { recursive: true });

  const archiveDoc = {
    archiveId,
    kind,
    source,
    title,
    createdAt,
    project,
    scene,
    participants,
    messages,
    text: messages ? undefined : renderedText,
    contentHash,
  };

  const jsonRel = path.join(cfg.archiveSessionsDir, day, `${archiveId}.json`);
  const mdRel = path.join(cfg.archiveSessionsDir, day, `${archiveId}.md`);
  const chunkRel = path.join(cfg.archiveChunksDir, `${archiveId}.jsonl`);
  const manifestRel = path.join(cfg.archiveIndexesDir, 'archive-manifest.jsonl');

  const jsonAbs = path.join(cfg.workspaceRoot, jsonRel);
  const mdAbs = path.join(cfg.workspaceRoot, mdRel);
  const chunkAbs = path.join(cfg.workspaceRoot, chunkRel);
  const manifestAbs = path.join(cfg.workspaceRoot, manifestRel);

  await fs.writeFile(jsonAbs, `${JSON.stringify(archiveDoc, null, 2)}\n`, 'utf8');

  const markdown = [
    `# ${title}`,
    '',
    `- archiveId: ${archiveId}`,
    `- kind: ${kind}`,
    `- source: ${source}`,
    `- createdAt: ${createdAt}`,
    `- contentHash: ${contentHash}`,
    project ? `- project: ${project}` : null,
    scene ? `- scene: ${scene}` : null,
    participants.length ? `- participants: ${participants.join(', ')}` : null,
    '',
    renderedText,
    '',
  ].filter(Boolean).join('\n');

  await fs.writeFile(mdAbs, markdown, 'utf8');

  const textChunks = chunkText(renderedText, cfg.archiveChunkMaxChars, cfg.archiveChunkOverlapChars);
  const chunkRecords = textChunks.map((text, index) => ({
    chunkId: `${archiveId}-${String(index + 1).padStart(4, '0')}`,
    archiveId,
    kind: 'session-chunk',
    source,
    title,
    project,
    scene,
    participants,
    memoryType: 'discussion',
    timestampStart: createdAt,
    timestampEnd: createdAt,
    text,
    sourcePath: jsonRel,
    contentHash,
  }));

  const chunkPayload = chunkRecords.map((record) => JSON.stringify(record)).join('\n');
  await fs.writeFile(chunkAbs, `${chunkPayload}\n`, 'utf8');

  await appendJsonl(manifestAbs, {
    archiveId,
    title,
    kind,
    source,
    createdAt,
    project,
    scene,
    participants,
    contentHash,
    dedupeKey,
    sessionPath: jsonRel,
    markdownPath: mdRel,
    chunkPath: chunkRel,
    chunkCount: chunkRecords.length,
    ingestedAt: new Date().toISOString(),
  });

  return {
    ok: true,
    archiveId,
    scene,
    project,
    sessionPath: jsonRel,
    markdownPath: mdRel,
    chunkPath: chunkRel,
    chunkCount: chunkRecords.length,
    deduped: false,
  };
}

export async function searchArchive(cfg, input) {
  await ensureArchiveDirs(cfg);
  const query = String(input.query || '');
  const normalized = normalizeTaskText(query);
  const terms = normalized.split(/\s+/).filter(Boolean);
  const requestedScene = input.scene ? String(input.scene) : inferScene(query, input.scene);
  const requestedProject = input.project ? String(input.project) : null;
  const chunksRoot = path.join(cfg.workspaceRoot, cfg.archiveChunksDir);
  const entries = await fs.readdir(chunksRoot, { withFileTypes: true }).catch(() => []);
  const scored = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const abs = path.join(chunksRoot, entry.name);
    const content = await fs.readFile(abs, 'utf8').catch(() => '');
    if (!content.trim()) continue;
    for (const line of content.split(/\n+/).filter(Boolean)) {
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      const text = String(record.text || '');
      const textScore = scoreText(text, terms);
      if (textScore <= 0) continue;
      let score = textScore;
      const relPath = path.relative(cfg.workspaceRoot, abs);
      const textLower = text.toLowerCase();
      if (requestedScene && record.scene === requestedScene) score += 6;
      if (requestedScene && textLower.includes(requestedScene.toLowerCase())) score += 3;
      if (requestedProject && (record.project === requestedProject || textLower.includes(requestedProject.toLowerCase()))) score += 4;
      if (query && textLower.includes(query.toLowerCase())) score += 3;
      const createdAt = record.timestampStart || record.timestampEnd || '';
      scored.push({
        archiveId: record.archiveId,
        chunkId: record.chunkId,
        path: relPath,
        score,
        scene: record.scene || null,
        project: record.project || null,
        source: record.source || null,
        createdAt,
        snippet: splitSnippet(text, query, 700),
      });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  return {
    query,
    scene: requestedScene,
    project: requestedProject,
    results: scored.slice(0, input.maxResults || 5),
  };
}
