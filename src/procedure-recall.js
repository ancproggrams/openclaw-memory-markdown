import path from 'node:path';
import { collectFiles, safeRead, splitSnippet } from './core.js';
import { inferScene, normalizeTaskText } from './fingerprint.js';

function scoreText(content, terms) {
  const lower = content.toLowerCase();
  let score = 0;
  for (const term of terms) score += lower.split(term).length - 1;
  return score;
}

function isTaskLikeQuery(query = '') {
  const normalized = normalizeTaskText(query);
  if (!normalized) return false;
  return /(fix|recover|restore|rerun|resume|debug|deploy|release|rollback|repair|unblock|investigate|resolve|how|steps|runbook|procedure|playbook|workflow|incident|failure|broken|issue|error|crash|restart|reindex|promote|migrate|setup|implement|build|test)/.test(normalized);
}

function procedureWeight(relPath, scene, project, contentLower, taskLike) {
  const lower = relPath.toLowerCase();
  let score = 0;
  if (lower.includes('/procedures/') || lower.startsWith('memory/procedures/')) score += taskLike ? 14 : 7;
  if (scene && lower.includes(`${scene.toLowerCase()}.md`)) score += 8;
  if (project && (lower.includes(project.toLowerCase()) || contentLower.includes(project.toLowerCase()))) score += 4;
  if (taskLike && /when to use|repeatable flow|recovery playbook|verification cues/.test(contentLower)) score += 6;
  if (taskLike && /recovery/.test(contentLower)) score += 3;
  return score;
}

export async function procedureRecall(cfg, input) {
  const query = String(input.query || '');
  const scene = inferScene(query, input.scene);
  const project = input.project || null;
  const taskLike = input.taskLike ?? isTaskLikeQuery(query);
  const files = await collectFiles(cfg);
  const terms = normalizeTaskText(query).split(/\s+/).filter(Boolean);
  const scored = [];

  for (const file of files) {
    const content = await safeRead(file, cfg.maxFileBytes).catch(() => null);
    if (!content) continue;
    const relPath = path.relative(cfg.workspaceRoot, file);
    const contentLower = content.toLowerCase();
    let score = scoreText(content, terms);
    if (score <= 0) continue;

    score += procedureWeight(relPath, scene, project, contentLower, taskLike);
    if (scene && scene !== 'general' && contentLower.includes(scene.toLowerCase())) score += 4;

    scored.push({
      path: relPath,
      score,
      scene,
      project,
      taskLike,
      snippet: splitSnippet(content, query),
      sourceType: relPath.includes('/procedures/') || relPath.startsWith('memory/procedures/') ? 'procedure' : 'memory',
    });
  }

  const results = scored.sort((a, b) => b.score - a.score).slice(0, input.maxResults || 5);
  return { query, scene, project, taskLike, results };
}

export { isTaskLikeQuery };
