import fg from 'fast-glob';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const DEFAULTS = {
  memoryDir: 'memory',
  coreFiles: ['MEMORY.md', 'MEMORY_PREFERENCES.md', 'KNOWLEDGE_FACTS.md'],
  factsGlobs: ['memory/**/*.md', 'memory/facts/**/*.md'],
  includeDocs: true,
  docsGlobs: ['docs/**/*.md'],
  maxFileBytes: 262144,
  autoRecall: false,
  autoInjectMaxResults: 3,
  dailyWriteMode: 'append-only',
  archiveEnabled: true,
  archiveSessionsDir: 'memory/archive/conversations/sessions',
  archiveChunksDir: 'memory/archive/chunks',
  archiveIndexesDir: 'memory/archive/indexes',
  archiveEntityMapsDir: 'memory/archive/entity_maps',
  archiveChunkMaxChars: 1200,
  archiveChunkOverlapChars: 200,
};

export function expandHome(input) {
  if (!input) return input;
  if (input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return input;
}

export function resolveConfig(raw = {}) {
  const workspaceRoot = expandHome(raw.workspaceRoot || process.cwd());
  return {
    ...DEFAULTS,
    ...raw,
    workspaceRoot,
  };
}

export function todayStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function safeRead(filePath, maxFileBytes) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size > maxFileBytes) return null;
  return fs.readFile(filePath, 'utf8');
}

export function splitSnippet(text, query, maxLen = 600) {
  const hay = text.toLowerCase();
  const needle = query.toLowerCase();
  const hit = hay.indexOf(needle);
  if (hit === -1) return text.slice(0, maxLen).trim();
  const start = Math.max(0, hit - 220);
  const end = Math.min(text.length, hit + needle.length + 220);
  return text.slice(start, end).trim();
}

export async function collectFiles(cfg) {
  const patterns = [
    ...cfg.coreFiles,
    ...cfg.factsGlobs,
    ...(cfg.includeDocs ? cfg.docsGlobs : []),
  ];
  return fg(patterns, {
    cwd: cfg.workspaceRoot,
    absolute: true,
    onlyFiles: true,
    unique: true,
    dot: false,
  });
}

export async function searchMemory(cfg, query, maxResults = 5) {
  const files = await collectFiles(cfg);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = [];

  for (const file of files) {
    const content = await safeRead(file, cfg.maxFileBytes).catch(() => null);
    if (!content) continue;
    const lower = content.toLowerCase();
    let score = 0;
    for (const term of terms) score += lower.split(term).length - 1;
    if (score <= 0) continue;
    scored.push({
      path: path.relative(cfg.workspaceRoot, file),
      score,
      snippet: splitSnippet(content, query),
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

export async function appendDailyMemory(cfg, text, date = new Date()) {
  const rel = path.join(cfg.memoryDir, `${todayStamp(date)}.md`);
  const abs = path.join(cfg.workspaceRoot, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const payload = text.endsWith('\n') ? text : `${text}\n`;
  await fs.appendFile(abs, payload);
  return { path: rel };
}
