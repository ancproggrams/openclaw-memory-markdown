import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { inferScene } from './fingerprint.js';
import { classifyArchiveSentence } from './archive-classifier.js';
import { ensurePromotionSidecars, promotionsPath, conflictsPath, registryPath } from './promotion.js';

function archiveCandidatesPath(cfg) {
  return path.join(cfg.workspaceRoot, cfg.memoryDir, 'archive', 'indexes', 'archive-candidates.jsonl');
}

async function ensureSidecar(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, '');
}

async function appendJsonl(filePath, record) {
  await ensureSidecar(filePath);
  await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
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

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contentHash(text) {
  return `sha256:${crypto.createHash('sha256').update(normalizeText(text)).digest('hex')}`;
}

function tokenSet(text) {
  return new Set(normalizeText(text).split(/\s+/).filter(Boolean));
}

function overlapRatio(a, b) {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (!setA.size || !setB.size) return 0;
  let overlap = 0;
  for (const token of setA) {
    if (setB.has(token)) overlap += 1;
  }
  return overlap / Math.max(setA.size, setB.size);
}


function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 25);
}

function buildRegistryId(sourceId, index) {
  const safe = sourceId.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `arc_${safe}_${String(index + 1).padStart(3, '0')}`;
}

export async function extractArchiveCandidates(cfg, input = {}) {
  const chunkRoot = path.join(cfg.workspaceRoot, cfg.archiveChunksDir);
  const candidatePath = archiveCandidatesPath(cfg);
  const files = await fs.readdir(chunkRoot, { withFileTypes: true }).catch(() => []);
  const existing = await readJsonl(candidatePath);
  const existingHashes = new Set(existing.map((item) => item.candidateHash));
  const created = [];

  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.jsonl')) continue;
    const content = await fs.readFile(path.join(chunkRoot, file.name), 'utf8').catch(() => '');
    for (const line of content.split(/\n+/).filter(Boolean)) {
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      const sentences = splitSentences(record.text || '');
      for (const sentence of sentences) {
        const classified = classifyArchiveSentence(sentence);
        if (!classified) continue;
        const candidateHash = contentHash(`${classified.candidateType}:${sentence}`);
        if (existingHashes.has(candidateHash)) continue;
        const candidate = {
          candidateHash,
          candidateType: classified.candidateType,
          classification: classified.classification,
          content: sentence,
          archiveId: record.archiveId,
          chunkId: record.chunkId,
          scene: record.scene || inferScene(sentence),
          project: record.project || null,
          sourcePath: record.sourcePath || path.join(cfg.archiveChunksDir, file.name),
          createdAt: record.timestampStart || record.timestampEnd || new Date().toISOString(),
          status: 'pending-review',
          confidence: classified.confidence,
          extractionMethod: 'archive-classifier-v1',
        };
        created.push(candidate);
        existingHashes.add(candidateHash);
        await appendJsonl(candidatePath, candidate);
      }
    }
  }

  return {
    ok: true,
    path: path.relative(cfg.workspaceRoot, candidatePath),
    createdCount: created.length,
    candidates: created,
  };
}

async function existingTargetLines(targetPath) {
  const raw = await fs.readFile(targetPath, 'utf8').catch(() => '');
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export async function promoteArchiveCandidates(cfg, input = {}) {
  await ensurePromotionSidecars(cfg);
  const candidatePath = archiveCandidatesPath(cfg);
  const records = await readJsonl(candidatePath);
  const pending = records.filter((record) => record.status === 'pending-review');
  const prefPath = path.join(cfg.workspaceRoot, 'MEMORY_PREFERENCES.md');
  const factsPath = path.join(cfg.workspaceRoot, 'KNOWLEDGE_FACTS.md');
  const prefLines = await existingTargetLines(prefPath);
  const factLines = await existingTargetLines(factsPath);
  const promoted = [];
  const conflicts = [];
  const duplicates = [];
  const maxPromotions = input.maxPromotions || 10;
  let changed = false;

  for (const [index, record] of pending.entries()) {
    if (promoted.length >= maxPromotions) break;
    if ((input.minimumConfidence || 0.65) > record.confidence) continue;
    const target = record.candidateType === 'mem' ? prefPath : factsPath;
    const relTarget = path.relative(cfg.workspaceRoot, target);
    const existing = record.candidateType === 'mem' ? prefLines : factLines;
    const hash = contentHash(record.content);

    if (existing.some((line) => contentHash(line) === hash || overlapRatio(line, record.content) >= 0.9)) {
      duplicates.push({
        candidateHash: record.candidateHash,
        target: relTarget,
        action: 'skipped_duplicate',
      });
      record.status = 'duplicate';
      changed = true;
      await appendJsonl(promotionsPath(cfg), {
        timestamp: new Date().toISOString(),
        source: record.sourcePath,
        entryType: record.candidateType,
        contentHash: hash,
        target: relTarget,
        action: 'skipped_duplicate',
        reason: 'archive_candidate_duplicate',
      });
      continue;
    }

    if (record.candidateType === 'fact') {
      const conflictLine = existing.find((line) => overlapRatio(line, record.content) >= 0.6);
      if (conflictLine) {
        const conflict = {
          timestamp: new Date().toISOString(),
          contentHash: hash,
          existingTarget: relTarget,
          newSource: record.sourcePath,
          conflictType: 'archive_fact_conflict',
          resolution: 'flagged_for_review',
          candidateHash: record.candidateHash,
        };
        conflicts.push(conflict);
        record.status = 'conflict';
        changed = true;
        await appendJsonl(conflictsPath(cfg), conflict);
        await appendJsonl(promotionsPath(cfg), {
          timestamp: conflict.timestamp,
          source: record.sourcePath,
          entryType: record.candidateType,
          contentHash: hash,
          target: relTarget,
          action: 'conflict_detected',
          reason: conflict.conflictType,
        });
        continue;
      }
    }

    await fs.appendFile(target, `\n## Archive Promotion\n[${record.candidateType}] ${record.content}\n`);
    existing.push(record.content);
    record.status = 'promoted';
    record.promotedAt = new Date().toISOString();
    record.promotedTo = relTarget;
    changed = true;

    const promotion = {
      timestamp: record.promotedAt,
      source: record.sourcePath,
      entryType: record.candidateType,
      contentHash: hash,
      target: relTarget,
      action: 'promoted',
      reason: 'archive_candidate_gated_promotion',
      candidateHash: record.candidateHash,
    };
    promoted.push(promotion);
    await appendJsonl(promotionsPath(cfg), promotion);
    await appendJsonl(registryPath(cfg), {
      id: buildRegistryId(record.archiveId || record.chunkId || 'archive', index),
      kind: record.candidateType === 'fact' ? 'fact' : 'memory',
      status: 'active',
      source: record.sourcePath,
      target: relTarget,
      createdAt: record.promotedAt,
      supersedes: null,
      scene: record.scene || 'general',
      project: record.project || null,
    });
  }

  if (changed) {
    const rewritten = records.map((record) => JSON.stringify(record)).join('\n');
    await fs.writeFile(candidatePath, rewritten ? `${rewritten}\n` : '', 'utf8');
  }

  return {
    ok: true,
    path: path.relative(cfg.workspaceRoot, candidatePath),
    promoted,
    duplicates,
    conflicts,
    remainingPending: records.filter((record) => record.status === 'pending-review').length,
  };
}
