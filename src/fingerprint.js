const SYNONYM_REPLACEMENTS = [
  [/\bdocker\s*[- ]?compose\b/g, 'docker-compose'],
  [/\bdocker\s+compose\b/g, 'docker-compose'],
  [/\bdocker-compose\b/g, 'docker-compose'],
  [/\bdeploy(?:ment|ing)?\b/g, 'deploy'],
  [/\bbackend\s+service\b/g, 'backend'],
  [/\bfront\s*end\b/g, 'frontend'],
  [/\bset\s*up\b/g, 'setup'],
  [/\blog\s*in\b/g, 'login'],
  [/\bhealth\s*check\b/g, 'health-check'],
];

const STOPWORDS = new Set([
  'a', 'an', 'and', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'via', 'with',
  'de', 'het', 'een', 'en', 'van', 'naar', 'op', 'te', 'met', 'voor', 'door', 'using', 'use',
  'run', 'running', 'task', 'please', 'then', 'that', 'this', 'already', 'check',
]);

const SCENE_KEYWORDS = [
  { scene: 'deployment', keywords: ['deploy', 'docker', 'docker-compose', 'rollout', 'release', 'ship'] },
  { scene: 'debugging', keywords: ['bug', 'error', 'failing', 'failure', 'fix', 'stacktrace', 'incident'] },
  { scene: 'research', keywords: ['search', 'summarize', 'compare', 'investigate', 'analyse', 'analyze'] },
  { scene: 'coding', keywords: ['refactor', 'implement', 'code', 'test', 'build', 'feature'] },
  { scene: 'memory-maintenance', keywords: ['memory', 'consolidate', 'reindex', 'recall', 'promote'] },
  { scene: 'content', keywords: ['report', 'publish', 'draft', 'article', 'write', 'post'] },
  { scene: 'ops', keywords: ['monitor', 'alert', 'cron', 'uptime', 'runbook', 'ops'] },
];

export function normalizeTaskText(input = '') {
  let text = String(input).toLowerCase();
  for (const [pattern, replacement] of SYNONYM_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  text = text
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

export function tokenizeTask(input = '') {
  const normalized = normalizeTaskText(input);
  if (!normalized) return [];
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token));

  return [...new Set(tokens)];
}

export function fingerprintTask(input = '') {
  return tokenizeTask(input).join('|');
}

export function inferScene(taskDescription = '', explicitScene) {
  if (explicitScene && String(explicitScene).trim()) return String(explicitScene).trim();
  const normalized = normalizeTaskText(taskDescription);
  for (const entry of SCENE_KEYWORDS) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) return entry.scene;
  }
  return 'general';
}
