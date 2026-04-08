import { normalizeTaskText } from './fingerprint.js';

function countMatches(text, patterns) {
  let count = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) count += 1;
  }
  return count;
}

export function classifyArchiveSentence(input = '') {
  const text = normalizeTaskText(input);
  if (!text || text.length < 20) return null;

  const decisionSignals = countMatches(text, [
    /\bwe decided\b/, /\bbesloten\b/, /\bgekozen\b/, /\bkozen\b/, /\bchose\b/, /\bchoose\b/, /\btherefore\b/, /\bdaarom\b/
  ]);
  const preferenceSignals = countMatches(text, [
    /\bprefer\b/, /\bvoorkeur\b/, /\bstandard\b/, /\bstandaard\b/, /\bdefault\b/, /\balways\b/, /\bmeestal\b/
  ]);
  const factSignals = countMatches(text, [
    /\buses\b/, /\bgebruikt\b/, /\bruns\b/, /\bdraait\b/, /\bis\b/, /\bend-to-end\b/, /\bendpoint\b/, /\bconfigured\b/, /\bingesteld\b/
  ]);
  const procedureSignals = countMatches(text, [
    /\bstep\b/, /\bstappen\b/, /\bfirst\b/, /\bthen\b/, /\bdaarna\b/, /\brestart\b/, /\bre-run\b/, /\bverification\b/, /\bcontroleer\b/
  ]);

  const ranked = [
    { type: 'decision', score: 0.45 + decisionSignals * 0.15 },
    { type: 'preference', score: 0.46 + preferenceSignals * 0.16 },
    { type: 'fact', score: 0.44 + factSignals * 0.13 },
    { type: 'procedure-signal', score: 0.4 + procedureSignals * 0.14 },
  ].filter((item) => item.score > 0.5);

  if (!ranked.length) return null;
  ranked.sort((a, b) => b.score - a.score);
  const best = ranked[0];

  let candidateType = null;
  if (best.type === 'preference') candidateType = 'mem';
  if (best.type === 'fact' || best.type === 'decision') candidateType = 'fact';
  if (best.type === 'procedure-signal') candidateType = 'mem';
  if (!candidateType) return null;

  return {
    classification: best.type,
    candidateType,
    confidence: Number(Math.min(0.95, best.score).toFixed(2)),
  };
}
