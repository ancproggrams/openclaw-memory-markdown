import fs from 'node:fs/promises';
import path from 'node:path';
import { readProcedureCandidates } from './procedures.js';

const DEFAULT_MINIMUM_OCCURRENCES = 2;

export function skillUpdateSuggestionPath(cfg) {
  return path.join(cfg.workspaceRoot, cfg.memoryDir, 'skill-update-suggestions.jsonl');
}

async function ensureSidecar(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, '');
}

export async function ensureSkillUpdateSuggestionSidecar(cfg) {
  await ensureSidecar(skillUpdateSuggestionPath(cfg));
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

function latestBySuggestionId(entries) {
  const map = new Map();
  for (const entry of entries) map.set(entry.suggestionId, entry);
  return map;
}

function slugify(value = 'general') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'general';
}

function titleCase(value = '') {
  return String(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'General';
}

function summarizeRecovery(candidate) {
  if (!candidate.recoveryPlaybook) return null;
  return `${candidate.recoveryPlaybook.successfulRecoveryCount} recoveries after ${candidate.recoveryPlaybook.repeatedFailureCount} repeated failures`;
}

function buildTargetSkill(candidate) {
  if (candidate.project) return `${slugify(candidate.project)}-${slugify(candidate.scene || candidate.taskType || 'skill')}`;
  return slugify(candidate.scene || candidate.taskType || 'general');
}

function buildSuggestion(candidate) {
  const targetSkill = buildTargetSkill(candidate);
  const recoverySummary = summarizeRecovery(candidate);
  const sampleTasks = Array.isArray(candidate.sampleTaskDescriptions) ? candidate.sampleTaskDescriptions.slice(0, 3) : [];
  const verificationSignals = Array.isArray(candidate.verificationSignals) ? candidate.verificationSignals.slice(0, 3) : [];
  const suggestedUpdates = [
    `capture the repeatable ${titleCase(candidate.scene || candidate.taskType || 'general').toLowerCase()} workflow in the skill instructions`,
    sampleTasks.length ? `add an example for: ${sampleTasks[0]}` : null,
    verificationSignals.length ? 'document the observed verification cues so the skill can self-check completion' : null,
    recoverySummary ? 'include a lightweight recovery section for the repeated failure pattern' : null,
  ].filter(Boolean);

  return {
    suggestionId: `skill_${candidate.candidateId}`,
    candidateId: candidate.candidateId,
    status: 'pending-review',
    source: 'procedural-memory',
    targetSkill,
    project: candidate.project || null,
    scene: candidate.scene || null,
    taskType: candidate.taskType || null,
    procedureTitle: candidate.procedureTitle || sampleTasks[0] || candidate.taskFingerprint,
    rationale: `Stable procedure promoted from repeated successful runs (${candidate.occurrenceCount} successes) is a good candidate for a reusable skill update.`,
    occurrenceCount: candidate.occurrenceCount || 0,
    recoverySummary,
    suggestedUpdates,
    evidence: {
      summaries: Array.isArray(candidate.summaries) ? candidate.summaries.slice(0, 3) : [],
      artifacts: Array.isArray(candidate.artifacts) ? candidate.artifacts.slice(0, 5) : [],
      sampleTaskDescriptions: sampleTasks,
      verificationSignals,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function readSkillUpdateSuggestions(cfg) {
  return readJsonl(skillUpdateSuggestionPath(cfg));
}

export async function listSkillUpdateSuggestions(cfg, options = {}) {
  const entries = await readSkillUpdateSuggestions(cfg);
  const latest = Array.from(latestBySuggestionId(entries).values())
    .filter((entry) => options.status ? entry.status === options.status : true)
    .sort((a, b) => (b.generatedAt || '').localeCompare(a.generatedAt || ''));

  return {
    total: latest.length,
    suggestions: options.maxResults ? latest.slice(0, options.maxResults) : latest,
  };
}

export async function generateSkillUpdateSuggestions(cfg, options = {}) {
  await ensureSkillUpdateSuggestionSidecar(cfg);
  const minimumOccurrenceCount = options.minimumOccurrenceCount || DEFAULT_MINIMUM_OCCURRENCES;
  const requirePromoted = options.requirePromoted !== false;

  const [candidateHistory, suggestionHistory] = await Promise.all([
    readProcedureCandidates(cfg),
    readSkillUpdateSuggestions(cfg),
  ]);

  const latestCandidates = new Map();
  for (const candidate of candidateHistory) latestCandidates.set(candidate.candidateId, candidate);
  const existingSuggestions = latestBySuggestionId(suggestionHistory);

  const created = [];
  for (const candidate of latestCandidates.values()) {
    if ((candidate.occurrenceCount || 0) < minimumOccurrenceCount) continue;
    if (requirePromoted && candidate.status !== 'promoted') continue;

    const suggestion = buildSuggestion(candidate);
    const existing = existingSuggestions.get(suggestion.suggestionId);
    if (existing) continue;

    await fs.appendFile(skillUpdateSuggestionPath(cfg), `${JSON.stringify(suggestion)}\n`);
    created.push(suggestion);
  }

  return {
    path: path.relative(cfg.workspaceRoot, skillUpdateSuggestionPath(cfg)),
    created: created.length,
    suggestions: created,
    minimumOccurrenceCount,
    requirePromoted,
  };
}
