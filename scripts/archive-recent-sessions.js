#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { ingestSessionArchive } from '../src/recall.js';
import { resolveConfig } from '../src/core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.resolve(__dirname, '..');

function expandHome(input) {
  if (!input) return input;
  if (input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return input;
}

function ingestStatePath(workspaceRoot) {
  return path.join(workspaceRoot, 'memory', 'archive', 'indexes', 'session-ingest-state.json');
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

async function readState(filePath) {
  const raw = await fs.readFile(filePath, 'utf8').catch(() => '');
  if (!raw.trim()) return { files: {} };
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { files: {} };
  } catch {
    return { files: {} };
  }
}

async function writeState(filePath, state) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function extractMessage(entry) {
  if (entry?.type === 'message' && entry.message) return entry.message;
  if (entry?.role) return entry;
  return null;
}

function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === 'string') return item;
      if (item?.text) return item.text;
      return '';
    }).join(' ').trim();
  }
  return '';
}

async function main() {
  const sessionsRoot = expandHome(process.argv[2] || '~/.openclaw/agents/main/sessions');
  const workspaceRoot = expandHome(process.argv[3] || path.resolve(pluginRoot, '..', '..'));
  const cfg = resolveConfig({ workspaceRoot, includeDocs: true });
  const files = await fs.readdir(sessionsRoot, { withFileTypes: true }).catch(() => []);
  const stateFile = ingestStatePath(workspaceRoot);
  const state = await readState(stateFile);
  let ingested = 0;
  let deduped = 0;
  let skippedUnchanged = 0;

  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.jsonl')) continue;
    const abs = path.join(sessionsRoot, file.name);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat) continue;
    const prior = state.files[abs];
    if (prior && prior.mtimeMs === stat.mtimeMs && prior.size === stat.size) {
      skippedUnchanged += 1;
      continue;
    }

    const entries = await readJsonl(abs);
    const messages = entries
      .map(extractMessage)
      .filter(Boolean)
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        role: msg.role,
        text: extractText(msg.content || msg.text || ''),
        timestamp: msg.timestamp || msg.createdAt || null,
      }))
      .filter((msg) => msg.text);

    state.files[abs] = { mtimeMs: stat.mtimeMs, size: stat.size, checkedAt: new Date().toISOString() };
    if (!messages.length) continue;

    const sessionId = path.basename(file.name, '.jsonl');
    const result = await ingestSessionArchive(cfg, {
      sessionId,
      title: `Session ${sessionId}`,
      messages,
      source: 'openclaw-session-log',
      createdAt: messages[0]?.timestamp || undefined,
    });
    if (result.deduped) deduped += 1;
    else ingested += 1;
  }

  await writeState(stateFile, state);
  process.stdout.write(JSON.stringify({ ok: true, sessionsRoot, workspaceRoot, ingested, deduped, skippedUnchanged }, null, 2) + '\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
