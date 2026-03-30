import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintTask, inferScene, normalizeTaskText, tokenizeTask } from '../src/fingerprint.js';

test('normalizeTaskText canonicalizes docker compose phrasing', () => {
  assert.equal(
    normalizeTaskText('Deploy the backend with docker compose!'),
    'deploy the backend with docker-compose'
  );
});

test('fingerprintTask produces stable normalized fingerprints', () => {
  const a = fingerprintTask('Deploy backend via docker compose');
  const b = fingerprintTask('deploy the backend with docker-compose');
  assert.equal(a, 'deploy|backend|docker-compose');
  assert.equal(a, b);
});

test('tokenizeTask removes stopwords and keeps meaningful tokens', () => {
  assert.deepEqual(tokenizeTask('please check the backend deployment with docker-compose'), [
    'backend',
    'deploy',
    'docker-compose',
  ]);
});

test('inferScene uses heuristics with explicit override support', () => {
  assert.equal(inferScene('Deploy backend via docker compose'), 'deployment');
  assert.equal(inferScene('Deploy backend via docker compose', 'ops'), 'ops');
});
