import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function sidecarPath(cfg, name) {
  return path.join(cfg.workspaceRoot, cfg.memoryDir, name);
}

export function promotionsPath(cfg) {
  return sidecarPath(cfg, 'promotions.jsonl');
}

export function conflictsPath(cfg) {
  return sidecarPath(cfg, 'conflicts.jsonl');
}

export function registryPath(cfg) {
  return sidecarPath(cfg, 'registry.jsonl');
}

async function ensureSidecar(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, '');
}

export async function ensurePromotionSidecars(cfg) {
  await Promise.all([
    ensureSidecar(promotionsPath(cfg)),
    ensureSidecar(conflictsPath(cfg)),
    ensureSidecar(registryPath(cfg)),
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

function normalizeText(text) {
  return String(text || '')
    .replace(/^\[(fact|mem|obs)\]\s*/i, '')
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

function parseTypedEntries(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(fact|mem|obs)\]\s*(.+)$/i);
      if (!match) return null;
      return { entryType: match[1].toLowerCase(), content: match[2].trim(), raw: line };
    })
    .filter(Boolean);
}

async function existingTargetLines(targetPath) {
  const raw = await fs.readFile(targetPath, 'utf8').catch(() => '');
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

async function appendJsonl(filePath, record) {
  await ensureSidecar(filePath);
  await fs.appendFile(filePath, `${JSON.stringify(record)}\n`);
}

function buildRegistryId(day, index) {
  return `mem_${day.replace(/-/g, '')}_${String(index + 1).padStart(3, '0')}`;
}

export async function promoteDailyMemory(cfg, input = {}) {
  await ensurePromotionSidecars(cfg);
  const day = input.day;
  const dailyPath = path.join(cfg.workspaceRoot, cfg.memoryDir, `${day}.md`);
  const daily = await fs.readFile(dailyPath, 'utf8').catch(() => '');
  if (!daily.trim()) {
    return {
      ok: true,
      day,
      source: path.join(cfg.memoryDir, `${day}.md`),
      promoted: [],
      duplicates: [],
      conflicts: [],
      skipped: [],
    };
  }

  const prefPath = path.join(cfg.workspaceRoot, 'MEMORY_PREFERENCES.md');
  const factsPath = path.join(cfg.workspaceRoot, 'KNOWLEDGE_FACTS.md');
  const prefLines = await existingTargetLines(prefPath);
  const factLines = await existingTargetLines(factsPath);
  const prefHashes = new Set(prefLines.map(contentHash));
  const factHashes = new Set(factLines.map(contentHash));
  const prefTexts = [...prefLines];
  const factTexts = [...factLines];

  const entries = parseTypedEntries(daily);
  const promoted = [];
  const duplicates = [];
  const conflicts = [];
  const skipped = [];
  const registryEntries = [];

  for (const [index, entry] of entries.entries()) {
    if (entry.entryType === 'obs') {
      skipped.push({ entryType: entry.entryType, content: entry.content, reason: 'observation_not_promoted_in_v1' });
      continue;
    }

    const target = entry.entryType === 'mem' ? prefPath : factsPath;
    const relTarget = path.relative(cfg.workspaceRoot, target);
    const hash = contentHash(entry.content);
    const existingHashes = entry.entryType === 'mem' ? prefHashes : factHashes;
    const existingTexts = entry.entryType === 'mem' ? prefTexts : factTexts;

    if (existingHashes.has(hash) || existingTexts.some((line) => overlapRatio(line, entry.content) >= 0.9)) {
      const duplicate = {
        timestamp: new Date().toISOString(),
        day,
        source: path.join(cfg.memoryDir, `${day}.md`),
        entryType: entry.entryType,
        contentHash: hash,
        target: relTarget,
        action: 'skipped_duplicate',
        reason: 'normalized_or_near_duplicate',
      };
      duplicates.push(duplicate);
      await appendJsonl(promotionsPath(cfg), duplicate);
      continue;
    }

    if (entry.entryType === 'fact') {
      const conflictLine = existingTexts.find((line) => overlapRatio(line, entry.content) >= 0.6);
      if (conflictLine) {
        const conflict = {
          timestamp: new Date().toISOString(),
          contentHash: hash,
          existingTarget: relTarget,
          newSource: path.join(cfg.memoryDir, `${day}.md`),
          conflictType: 'fact_value_conflict',
          resolution: 'flagged_for_review',
        };
        conflicts.push(conflict);
        await appendJsonl(conflictsPath(cfg), conflict);
        await appendJsonl(promotionsPath(cfg), {
          timestamp: conflict.timestamp,
          day,
          source: conflict.newSource,
          entryType: entry.entryType,
          contentHash: hash,
          target: relTarget,
          action: 'conflict_detected',
          reason: conflict.conflictType,
        });
        continue;
      }
    }

    await fs.appendFile(target, `\n## Consolidated ${day}\n[${entry.entryType}] ${entry.content}\n`);
    existingHashes.add(hash);
    existingTexts.push(entry.content);

    const promotion = {
      timestamp: new Date().toISOString(),
      day,
      source: path.join(cfg.memoryDir, `${day}.md`),
      entryType: entry.entryType,
      contentHash: hash,
      target: relTarget,
      action: 'promoted',
      reason: entry.entryType === 'fact' ? 'durable_verifiable_fact' : 'durable_preference_or_rule',
    };
    promoted.push(promotion);
    await appendJsonl(promotionsPath(cfg), promotion);

    const registryRecord = {
      id: buildRegistryId(day, index),
      kind: entry.entryType === 'fact' ? 'fact' : 'memory',
      status: 'active',
      source: path.join(cfg.memoryDir, `${day}.md`),
      target: relTarget,
      createdAt: promotion.timestamp,
      supersedes: null,
      scene: 'general',
      project: null,
    };
    registryEntries.push(registryRecord);
    await appendJsonl(registryPath(cfg), registryRecord);
  }

  return {
    ok: true,
    day,
    source: path.join(cfg.memoryDir, `${day}.md`),
    promoted,
    duplicates,
    conflicts,
    skipped,
    registryEntries,
  };
}

export async function readPromotionSidecars(cfg) {
  await ensurePromotionSidecars(cfg);
  const [promotions, conflicts, registry] = await Promise.all([
    readJsonl(promotionsPath(cfg)),
    readJsonl(conflictsPath(cfg)),
    readJsonl(registryPath(cfg)),
  ]);
  return { promotions, conflicts, registry };
}
