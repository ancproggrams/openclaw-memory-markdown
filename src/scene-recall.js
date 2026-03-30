import path from 'node:path';
import { collectFiles, safeRead, splitSnippet } from './core.js';
import { inferScene } from './fingerprint.js';

function scoreText(content, terms) {
  const lower = content.toLowerCase();
  let score = 0;
  for (const term of terms) score += lower.split(term).length - 1;
  return score;
}

function sceneWeight(filePath, scene, project) {
  const lower = filePath.toLowerCase();
  let weight = 0;
  if (scene && scene !== 'general' && lower.includes(scene)) weight += 6;
  if (project && lower.includes(project.toLowerCase())) weight += 4;
  if (lower.includes('/memory/') || lower.startsWith('memory/')) weight += 1;
  return weight;
}

export async function sceneRecall(cfg, input) {
  const scene = inferScene(input.query, input.scene);
  const project = input.project || null;
  const files = await collectFiles(cfg);
  const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = [];

  for (const file of files) {
    const content = await safeRead(file, cfg.maxFileBytes).catch(() => null);
    if (!content) continue;
    const textScore = scoreText(content, terms);
    if (textScore <= 0) continue;

    const relPath = path.relative(cfg.workspaceRoot, file);
    const contentLower = content.toLowerCase();
    let score = textScore;
    if (scene && scene !== 'general') {
      if (contentLower.includes(scene)) score += 5;
      score += sceneWeight(relPath, scene, project);
    }
    if (project && (relPath.toLowerCase().includes(project.toLowerCase()) || contentLower.includes(project.toLowerCase()))) {
      score += 4;
    }

    scored.push({
      path: relPath,
      score,
      scene,
      project,
      snippet: splitSnippet(content, input.query),
    });
  }

  const results = scored.sort((a, b) => b.score - a.score).slice(0, input.maxResults || 5);
  return {
    query: input.query,
    scene,
    project,
    results,
  };
}
