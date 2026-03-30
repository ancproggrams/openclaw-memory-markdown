import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MINIMUM_SUCCESSES = 2;
const DEFAULT_MINIMUM_PROMOTION_OCCURRENCES = 2;
const PROCEDURE_SECTION_MARKER = '<!-- marq-procedure:';

function operationsDir(cfg) {
  return path.join(cfg.workspaceRoot, cfg.memoryDir, 'operations');
}

export function proceduresDir(cfg) {
  return path.join(cfg.workspaceRoot, cfg.memoryDir, 'procedures');
}

export function taskRecordStorePath(cfg) {
  return path.join(operationsDir(cfg), 'tasks.jsonl');
}

export function procedureCandidateStorePath(cfg) {
  return path.join(operationsDir(cfg), 'procedure-candidates.jsonl');
}

export function procedureMarkdownPath(cfg, scene = 'general') {
  return path.join(proceduresDir(cfg), `${slugifySegment(scene || 'general')}.md`);
}

async function ensureSidecar(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, '');
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function ensureProcedureCandidateSidecar(cfg) {
  await ensureSidecar(procedureCandidateStorePath(cfg));
}

export async function ensureProceduresDir(cfg) {
  await ensureDirectory(proceduresDir(cfg));
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

export async function readTaskRecordsForProcedureCapture(cfg) {
  return readJsonl(taskRecordStorePath(cfg));
}

export async function readProcedureCandidates(cfg) {
  return readJsonl(procedureCandidateStorePath(cfg));
}

function latestCandidateByKey(candidates) {
  const map = new Map();
  for (const candidate of candidates) {
    map.set(candidate.candidateKey, candidate);
  }
  return map;
}

function buildCandidateKey(record) {
  return [
    record.taskFingerprint,
    record.scene || 'unknown',
    record.project || 'global',
    record.taskType || 'generic',
  ].join('::');
}

function stableCandidateId(group) {
  return `proc_${group.taskFingerprint.replace(/[^a-z0-9|_-]+/gi, '-').replace(/\|/g, '_')}__${group.scene || 'unknown'}__${group.project || 'global'}__${group.taskType || 'generic'}`;
}

function slugifySegment(value = 'general') {
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

function describeVerificationSignal(signal) {
  if (signal == null) return null;
  if (typeof signal === 'string') return signal;
  if (typeof signal !== 'object') return JSON.stringify(signal);
  const parts = [];
  if (signal.type) parts.push(`type: ${signal.type}`);
  if (signal.result) parts.push(`result: ${signal.result}`);
  const extras = Object.entries(signal)
    .filter(([key]) => key !== 'type' && key !== 'result')
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
  return [...parts, ...extras].join(', ');
}

function formatBulletList(items, fallback = '- none recorded') {
  const clean = [...new Set((items || []).filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
  if (!clean.length) return `${fallback}\n`;
  return clean.map((item) => `- ${item}`).join('\n') + '\n';
}

function describeRecoverySignal(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  const parts = [];
  if (entry.failureSummary) parts.push(`failure: ${entry.failureSummary}`);
  if (entry.recoverySummary) parts.push(`recovered via: ${entry.recoverySummary}`);
  if (entry.recoveredAt) parts.push(`recovered at: ${entry.recoveredAt}`);
  return parts.join(' | ');
}

function buildRecoveryPlaybook(group) {
  const attempts = [];
  for (let index = 0; index < group.records.length; index += 1) {
    const record = group.records[index];
    if (record.status !== 'success') continue;
    const priorFailures = [];
    for (let back = index - 1; back >= 0; back -= 1) {
      const previous = group.records[back];
      if (previous.status === 'success') break;
      if (previous.status === 'failed' || previous.status === 'partial') priorFailures.unshift(previous);
    }
    if (priorFailures.length) {
      attempts.push({ success: record, failures: priorFailures });
    }
  }

  const repeatedRecoveries = attempts.filter((attempt) => attempt.failures.length > 0);
  if (repeatedRecoveries.length < 1) return null;

  const failureSummaries = repeatedRecoveries
    .flatMap((attempt) => attempt.failures.map((failure) => failure.summary))
    .filter(Boolean);
  const recoverySummaries = repeatedRecoveries
    .map((attempt) => attempt.success.summary)
    .filter(Boolean);

  if (failureSummaries.length < 2 && repeatedRecoveries.length < 2) return null;

  return {
    repeatedFailureCount: failureSummaries.length,
    successfulRecoveryCount: repeatedRecoveries.length,
    commonFailures: [...new Set(failureSummaries)].slice(-5),
    recoverySignals: repeatedRecoveries.slice(-3).map((attempt) => ({
      failureSummary: attempt.failures.at(-1)?.summary || null,
      recoverySummary: attempt.success.summary || null,
      recoveredAt: attempt.success.finishedAt || null,
    })),
    lastRecoveredAt: repeatedRecoveries.at(-1)?.success.finishedAt || null,
  };
}

function buildProcedureTitle(candidate) {
  return candidate.procedureTitle
    || candidate.sampleTaskDescriptions?.[0]
    || titleCase((candidate.taskFingerprint || 'procedure').replace(/\|/g, ' '));
}

export function renderProcedureMarkdown(candidate, options = {}) {
  const scene = candidate.scene || 'general';
  const title = buildProcedureTitle(candidate);
  const sceneTitle = titleCase(scene);
  const project = candidate.project || 'global';
  const taskType = candidate.taskType || 'generic';
  const summaries = formatBulletList(candidate.summaries, '- no summaries captured');
  const taskExamples = formatBulletList(candidate.sampleTaskDescriptions, '- no task samples captured');
  const artifacts = formatBulletList(candidate.artifacts, '- no artifacts captured');
  const verifications = formatBulletList((candidate.verificationSignals || []).map(describeVerificationSignal), '- no verification signals captured');
  const recovery = candidate.recoveryPlaybook || null;
  const recoveryFailures = formatBulletList(recovery?.commonFailures, '- no repeated failures captured');
  const recoverySignals = formatBulletList((recovery?.recoverySignals || []).map(describeRecoverySignal), '- no successful recoveries captured');
  const lastVerifiedAt = candidate.lastSeenAt || candidate.generatedAt || new Date().toISOString();

  return `## ${title}\n${PROCEDURE_SECTION_MARKER}${candidate.candidateId} -->\n\n- **Procedure ID:** \`${candidate.candidateId}\`
- **Scene:** ${sceneTitle}
- **Project:** ${project}
- **Task type:** ${taskType}
- **Fingerprint:** \`${candidate.taskFingerprint}\`
- **Observed successes:** ${candidate.occurrenceCount}
- **First seen:** ${candidate.firstSeenAt}
- **Last seen:** ${candidate.lastSeenAt}
- **Promoted at:** ${options.promotedAt || new Date().toISOString()}

### When to use
Use this playbook for recurring ${sceneTitle.toLowerCase()} work that matches the fingerprint \`${candidate.taskFingerprint}\`.

### Repeatable flow (curated from task history)
${taskExamples}### Evidence from successful runs
${summaries}### Artifacts to expect
${artifacts}### Verification cues
${verifications}${recovery ? `### Recovery playbook
- **Repeated failures observed:** ${recovery.repeatedFailureCount}
- **Successful recoveries observed:** ${recovery.successfulRecoveryCount}
- **Last recovered at:** ${recovery.lastRecoveredAt || 'unknown'}

#### Common failure signals
${recoveryFailures}#### Recovery evidence
${recoverySignals}` : ''}### Maintenance notes
- Keep this procedure additive and human-edited as the durable markdown source of truth.
- Update after new successful runs or better verification steps.
- Last verified from candidate history: ${lastVerifiedAt}

`;
}

async function ensureProcedureMarkdownFile(cfg, scene = 'general') {
  await ensureProceduresDir(cfg);
  const filePath = procedureMarkdownPath(cfg, scene);
  try {
    await fs.access(filePath);
  } catch {
    const sceneTitle = titleCase(scene);
    const header = `# ${sceneTitle} Procedures\n\nCurated procedural memory for the ${sceneTitle.toLowerCase()} scene.\nMarkdown is the durable source of truth; candidate sidecars remain additive evidence.\n\n`;
    await fs.writeFile(filePath, header, 'utf8');
  }
  return filePath;
}

function procedureAlreadyPromoted(markdown, candidateId) {
  return markdown.includes(`${PROCEDURE_SECTION_MARKER}${candidateId} -->`);
}

export function generateProcedureCandidates(taskRecords, existingCandidates = [], options = {}) {
  const minimumSuccesses = options.minimumSuccesses || DEFAULT_MINIMUM_SUCCESSES;
  const reusable = taskRecords
    .filter((record) => record.taskFingerprint)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));

  const grouped = new Map();
  for (const record of reusable) {
    const candidateKey = buildCandidateKey(record);
    if (!grouped.has(candidateKey)) {
      grouped.set(candidateKey, {
        candidateKey,
        taskFingerprint: record.taskFingerprint,
        scene: record.scene || null,
        project: record.project || null,
        taskType: record.taskType || null,
        taskDescription: record.taskDescription,
        records: [],
      });
    }
    grouped.get(candidateKey).records.push(record);
  }

  const existingByKey = latestCandidateByKey(existingCandidates);
  const generated = [];

  for (const group of grouped.values()) {
    const successfulRecords = group.records.filter((record) => record.status === 'success' && record.reusable);
    if (successfulRecords.length < minimumSuccesses) continue;
    const existing = existingByKey.get(group.candidateKey);
    if (existing) continue;

    const summaries = [...new Set(successfulRecords.map((record) => record.summary).filter(Boolean))].slice(-3);
    const sampleTaskDescriptions = [...new Set(successfulRecords.map((record) => record.taskDescription).filter(Boolean))].slice(-3);
    const artifacts = [...new Set(successfulRecords.flatMap((record) => Array.isArray(record.artifacts) ? record.artifacts : []))].slice(0, 10);
    const verificationSignals = successfulRecords
      .map((record) => record.verification)
      .filter((value) => value != null)
      .slice(-3);
    const recoveryPlaybook = buildRecoveryPlaybook(group);

    generated.push({
      candidateId: stableCandidateId(group),
      candidateKey: group.candidateKey,
      status: 'pending-review',
      source: 'task-memory',
      taskFingerprint: group.taskFingerprint,
      scene: group.scene,
      project: group.project,
      taskType: group.taskType,
      procedureTitle: group.taskDescription,
      occurrenceCount: successfulRecords.length,
      firstSeenAt: successfulRecords[0].finishedAt,
      lastSeenAt: successfulRecords[successfulRecords.length - 1].finishedAt,
      sampleTaskDescriptions,
      summaries,
      artifacts,
      verificationSignals,
      recoveryPlaybook,
      generatedAt: new Date().toISOString(),
    });
  }

  return generated.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export function selectProcedureCandidatesForPromotion(candidates, options = {}) {
  const minimumOccurrenceCount = options.minimumOccurrenceCount || DEFAULT_MINIMUM_PROMOTION_OCCURRENCES;
  return candidates
    .filter((candidate) => (options.status ? candidate.status === options.status : true))
    .filter((candidate) => (candidate.occurrenceCount || 0) >= minimumOccurrenceCount)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function writeProcedureCandidate(cfg, candidate) {
  const filePath = procedureCandidateStorePath(cfg);
  await ensureProcedureCandidateSidecar(cfg);
  await fs.appendFile(filePath, `${JSON.stringify(candidate)}\n`);
  return {
    path: path.relative(cfg.workspaceRoot, filePath),
    candidate,
  };
}

export async function extractProcedureCandidateFromTaskRecords(cfg, options = {}) {
  await ensureProcedureCandidateSidecar(cfg);
  const [taskRecords, existingCandidates] = await Promise.all([
    readTaskRecordsForProcedureCapture(cfg),
    readProcedureCandidates(cfg),
  ]);

  const generated = generateProcedureCandidates(taskRecords, existingCandidates, options);
  if (!generated.length) {
    return {
      path: path.relative(cfg.workspaceRoot, procedureCandidateStorePath(cfg)),
      created: 0,
      candidates: [],
    };
  }

  for (const candidate of generated) {
    await writeProcedureCandidate(cfg, candidate);
  }

  return {
    path: path.relative(cfg.workspaceRoot, procedureCandidateStorePath(cfg)),
    created: generated.length,
    candidates: generated,
  };
}

export async function captureProcedureCandidates(cfg, options = {}) {
  return extractProcedureCandidateFromTaskRecords(cfg, options);
}

export async function listProcedureCandidates(cfg, options = {}) {
  return reviewProcedureCandidates(cfg, options);
}

export async function reviewProcedureCandidates(cfg, options = {}) {
  const candidates = await readProcedureCandidates(cfg);
  const latest = Array.from(latestCandidateByKey(candidates).values())
    .filter((candidate) => options.status ? candidate.status === options.status : true)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  return {
    total: latest.length,
    candidates: latest,
  };
}

export async function promoteProcedureCandidatesToMarkdown(cfg, options = {}) {
  const promotedAt = options.promotedAt || new Date().toISOString();
  const review = await reviewProcedureCandidates(cfg, { status: options.status || 'pending-review' });
  const selected = selectProcedureCandidatesForPromotion(review.candidates, options);
  const promoted = [];
  const skipped = [];

  for (const candidate of selected) {
    const filePath = await ensureProcedureMarkdownFile(cfg, candidate.scene || 'general');
    const markdown = await fs.readFile(filePath, 'utf8');

    if (procedureAlreadyPromoted(markdown, candidate.candidateId)) {
      skipped.push({
        candidateId: candidate.candidateId,
        reason: 'already-promoted',
        path: path.relative(cfg.workspaceRoot, filePath),
      });
      continue;
    }

    const block = renderProcedureMarkdown(candidate, { promotedAt });
    const payload = markdown.endsWith('\n\n') ? `${markdown}${block}` : `${markdown}\n${block}`;
    await fs.writeFile(filePath, payload, 'utf8');

    const promotedCandidate = {
      ...candidate,
      status: 'promoted',
      promotedAt,
      promotedTo: path.relative(cfg.workspaceRoot, filePath),
      markdownProcedureId: candidate.candidateId,
    };
    await writeProcedureCandidate(cfg, promotedCandidate);
    promoted.push({
      candidateId: candidate.candidateId,
      scene: candidate.scene || 'general',
      path: path.relative(cfg.workspaceRoot, filePath),
      procedureTitle: buildProcedureTitle(candidate),
    });
  }

  return {
    proceduresDir: path.relative(cfg.workspaceRoot, proceduresDir(cfg)),
    promotedCount: promoted.length,
    skippedCount: skipped.length,
    promoted,
    skipped,
  };
}
