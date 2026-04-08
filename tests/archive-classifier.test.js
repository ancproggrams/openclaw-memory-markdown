import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyArchiveSentence } from '../src/archive-classifier.js';

test('classifies decision-like archive sentences', () => {
  const result = classifyArchiveSentence('We decided to use Clerk for auth because the old OAuth recovery kept breaking.');
  assert.equal(result.classification, 'decision');
  assert.equal(result.candidateType, 'fact');
  assert.equal(result.confidence >= 0.6, true);
});

test('classifies preference-like archive sentences', () => {
  const result = classifyArchiveSentence('Vercel is the standard deploy route for web projects.');
  assert.equal(result.classification, 'preference');
  assert.equal(result.candidateType, 'mem');
});
