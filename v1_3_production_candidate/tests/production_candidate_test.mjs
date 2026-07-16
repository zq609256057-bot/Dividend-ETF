import assert from 'node:assert/strict';
import fs from 'node:fs';

import worker from '../worker.mjs';

const registry = JSON.parse(fs.readFileSync(new URL('../index_registry.json', import.meta.url), 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(new URL('../../v1_3_shadow/output/dividend_indices_latest.shadow.json', import.meta.url), 'utf8'));
const disabled = {
  code: '888888', name: 'Disabled', apiCode: '888888', enabled: false,
  market: 'TEST', category: 'dividend', dataStatus: {history: 'ready', latest: 'ready'},
};
const testRegistry = {...registry, indices: [...registry.indices, disabled]};
const testSnapshot = {...snapshot, indices: [...snapshot.indices, {code: '888888', name: 'Disabled'}]};

const values = new Map([
  ['dividend_indices_latest', testSnapshot],
  ['dividend_indices_last_success', testSnapshot],
  ['dividend_indices_history_dates', []],
  ['history_cache:000922:2026-07-14', {
    code: '000922', name: '中证红利指数', date: '2026-07-14', source: 'historical_calculation',
    valuation: {}, macro: {}, technical: {}, pine: {}, metadata: {},
  }],
  ['history_cache:930955:2026-07-14', {
    code: '930955', name: '红利低波100指数', date: '2026-07-14', source: 'historical_calculation',
    valuation: {}, macro: {}, technical: {}, pine: {}, metadata: {},
  }],
]);
const puts = [];
const env = {
  INDEX_REGISTRY_JSON: testRegistry,
  SNAPSHOT_ADMIN_TOKEN: 'x',
  DIVIDEND_SNAPSHOTS: {
    get: async (key, options) => {
      const value = values.get(key) ?? null;
      if (options?.type === 'text') return value == null ? null : JSON.stringify(value);
      return structuredClone(value);
    },
    put: async (...args) => puts.push(args),
  },
};

const indicesResponse = await worker.fetch(new Request('https://candidate.test/indices'), env);
assert.equal(indicesResponse.status, 200);
assert.deepEqual((await indicesResponse.json()).indices.map(item => item.code), ['000922', '930955']);

const latestResponse = await worker.fetch(new Request('https://candidate.test/latest'), env);
assert.equal(latestResponse.status, 200);
assert.deepEqual((await latestResponse.json()).indices.map(item => item.code), ['000922', '930955']);

const pineResponse = await worker.fetch(new Request('https://candidate.test/api/shadow/pine/latest'), env);
assert.equal(pineResponse.status, 200);
assert.deepEqual((await pineResponse.json()).indices.map(item => item.code), ['000922', '930955']);

for (const code of ['000922', '930955']) {
  const response = await worker.fetch(new Request(`https://candidate.test/history/calculate?code=${code}&date=2026-07-14`), env);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.code, code);
  assert.equal(payload.date, '2026-07-14');
}
const weekend = await worker.fetch(new Request('https://candidate.test/history/calculate?code=000922&date=2026-07-12'), env);
assert.equal(weekend.status, 422);
assert.equal((await weekend.json()).error, 'DATE_UNAVAILABLE');
const missing = await worker.fetch(new Request('https://candidate.test/history/calculate?code=000922&date=2026-01-02'), env);
assert.equal(missing.status, 404);
assert.equal((await missing.json()).error, 'DATE_NOT_FOUND');

const insufficientRegistry = structuredClone(testRegistry);
insufficientRegistry.indices[0].dataStatus.history = 'insufficient';
const insufficient = await worker.fetch(
  new Request('https://candidate.test/history/calculate?code=000922&date=2026-07-14'),
  {...env, INDEX_REGISTRY_JSON: insufficientRegistry},
);
assert.equal(insufficient.status, 422);
assert.equal((await insufficient.json()).error, 'INSUFFICIENT_HISTORY');

const extraEnabled = structuredClone(testRegistry);
extraEnabled.indices.push({...disabled, code: '999999', apiCode: '999999', enabled: true});
const extraResponse = await worker.fetch(new Request('https://candidate.test/indices'), {...env, INDEX_REGISTRY_JSON: extraEnabled});
assert.equal(extraResponse.status, 500);

function uploadRequest(headers = {}, payload = snapshot) {
  return new Request('https://candidate.test/admin/snapshot', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer x',
      'Content-Type': 'application/json',
      'X-KV-Allow-Write': 'true',
      'X-KV-Puts-Used-Today': '0',
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}
const noApproval = await worker.fetch(uploadRequest({'X-KV-Allow-Write': 'false'}), env);
assert.equal(noApproval.status, 403);
const quota = await worker.fetch(uploadRequest({'X-KV-Puts-Used-Today': '946'}), env);
assert.equal(quota.status, 429);
const duplicateEnv = {...env, DIVIDEND_SNAPSHOTS: {...env.DIVIDEND_SNAPSHOTS, get: async (key, options) => {
  if (key === 'dividend_indices_latest' && options?.type === 'text') return JSON.stringify(snapshot);
  return env.DIVIDEND_SNAPSHOTS.get(key, options);
}}};
const duplicate = await worker.fetch(uploadRequest(), duplicateEnv);
assert.equal(duplicate.status, 200);
assert.equal((await duplicate.json()).status, 'SKIPPED_DUPLICATE_PAYLOAD');
assert.equal(puts.length, 0);

const archiveValues = new Map([
  ['dividend_indices_latest', JSON.stringify({...snapshot, generated_at: 'previous'})],
  ['dividend_indices_history_dates', JSON.stringify([])],
]);
const archiveEnv = {
  ...env,
  DIVIDEND_SNAPSHOTS: {
    get: async (key, options) => {
      const raw = archiveValues.get(key);
      if (raw == null) return null;
      return options?.type === 'json' ? JSON.parse(raw) : raw;
    },
    put: async (key, value) => archiveValues.set(key, value),
  },
};
const stored = await worker.fetch(uploadRequest(), archiveEnv);
assert.equal(stored.status, 200);
assert.equal((await stored.json()).stored_history_date, true);
const archive = await worker.fetch(new Request(`https://candidate.test/archive?index=930955&date=${snapshot.as_of_date}`), archiveEnv);
assert.equal(archive.status, 200);
assert.equal((await archive.json()).data[0].as_of_date, snapshot.as_of_date);

console.log('V1.3 production candidate: registry isolation, latest/Pine filtering, history errors, auth, quota and duplicate guard passed');
