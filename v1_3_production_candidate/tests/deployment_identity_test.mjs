import assert from 'node:assert/strict';
import fs from 'node:fs';

import worker from '../worker.mjs';

const snapshot = JSON.parse(fs.readFileSync(
  new URL('../../v1_3_shadow/output/dividend_indices_latest.shadow.json', import.meta.url),
  'utf8',
));
const baseEnv = {DIVIDEND_SNAPSHOT: snapshot};

async function health(environmentMarker = Symbol.for('missing')) {
  const env = environmentMarker === Symbol.for('missing')
    ? {...baseEnv}
    : {...baseEnv, DEPLOYMENT_ENVIRONMENT: environmentMarker};
  const response = await worker.fetch(new Request('https://identity.test/health'), env);
  return {response, payload: await response.json()};
}

const candidate = await health('candidate');
assert.equal(candidate.response.status, 200);
assert.equal(candidate.payload.production, false);
assert.equal(candidate.payload.releaseCandidate, true);
assert.equal(candidate.payload.environment, 'candidate');
assert.equal(candidate.payload.service, 'dividend-index-management-production-candidate');
assert.equal(candidate.payload.status, 'ok');

const production = await health('production');
assert.equal(production.response.status, 200);
assert.equal(production.payload.production, true);
assert.equal(production.payload.releaseCandidate, false);
assert.equal(production.payload.environment, 'production');
assert.equal(production.payload.service, 'dividend-index-management-production');
assert.equal(production.payload.status, 'ok');

const identityKeys = new Set(['service', 'production', 'releaseCandidate', 'environment']);
const common = payload => Object.fromEntries(
  Object.entries(payload).filter(([key]) => !identityKeys.has(key)),
);
assert.deepEqual(common(candidate.payload), common(production.payload));

const missing = await health();
assert.equal(missing.response.status, 503);
assert.equal(missing.payload.status, 'configuration_error');
assert.equal(missing.payload.error, 'DEPLOYMENT_ENVIRONMENT_REQUIRED');
assert.equal(missing.payload.production, false);
assert.equal(missing.payload.releaseCandidate, false);
assert.equal(missing.payload.environment, null);

const invalid = await health('staging');
assert.equal(invalid.response.status, 503);
assert.equal(invalid.payload.status, 'configuration_error');
assert.equal(invalid.payload.error, 'DEPLOYMENT_ENVIRONMENT_INVALID');
assert.equal(invalid.payload.production, false);
assert.equal(invalid.payload.releaseCandidate, false);
assert.equal(invalid.payload.environment, 'staging');

const unaffected = await worker.fetch(new Request('https://identity.test/indices'), baseEnv);
assert.equal(unaffected.status, 200);
assert.deepEqual((await unaffected.json()).indices.map(item => item.code), ['000922', '930955']);

console.log('V1.3 deployment identity: candidate, production, missing and invalid fail-closed cases passed');
