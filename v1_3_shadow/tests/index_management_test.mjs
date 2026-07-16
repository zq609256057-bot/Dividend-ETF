import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import worker from '../worker.mjs';

const require = createRequire(import.meta.url);
const manager = require('../index_management.js');

const status = {market: 'ready', valuation: 'ready', macro: 'ready', history: 'ready', latest: 'ready', scoring: 'ready', ui: 'ready'};
const registry = {
  indices: [
    {code: '000922', name: '中证红利指数', apiCode: '000922', enabled: true, market: 'CN', category: 'dividend', dataStatus: status},
    {code: '930955', name: '红利低波100指数', apiCode: '930955', enabled: true, market: 'CN', category: 'dividend', dataStatus: status},
    {code: '999999', name: 'Mock 红利指数', apiCode: '999999', enabled: true, market: 'TEST', category: 'dividend', dataStatus: status},
    {code: '888888', name: '禁用指数', apiCode: '888888', enabled: false, market: 'TEST', category: 'dividend', dataStatus: status},
  ],
};
const snapshot = {
  schema_version: 'dividend_indices_snapshot_v1', status: 'success', as_of_date: '2026-07-14',
  indices: registry.indices.map(item => ({code: item.apiCode, name: item.name})),
};
const env = {INDEX_REGISTRY_JSON: registry, DIVIDEND_SNAPSHOT: snapshot, HISTORY_ENGINE_URL: 'https://history.test'};

const healthResponse = await worker.fetch(new Request('https://shadow.test/health'), env);
assert.equal(healthResponse.status, 200);
assert.deepEqual(await healthResponse.json(), {
  status: 'ok', service: 'dividend-index-management-shadow', production: false, kvWrites: 0,
  registrySchemaVersion: 'dividend_index_registry_v2', as_of_date: '2026-07-14',
});

const indicesResponse = await worker.fetch(new Request('https://shadow.test/indices'), env);
assert.equal(indicesResponse.status, 200);
const payload = await indicesResponse.json();
assert.deepEqual(payload.indices.map(item => item.code), ['000922', '930955', '999999']);
assert.equal(payload.indices.some(item => item.code === '888888'), false, 'disabled index must not leak');
assert.equal(payload.indices.every(item => item.latestAvailable && item.historyAvailable), true);

const normalized = manager.normalize(payload);
assert.equal(manager.findByCode(normalized, '000922').name, '中证红利指数');
assert.equal(manager.findByCode(normalized, '930955').name, '红利低波100指数');
assert.equal(manager.findByCode(normalized, '123456'), null, 'unknown code must not be created');

const latestResponse = await worker.fetch(new Request('https://shadow.test/latest'), env);
assert.equal(latestResponse.status, 200);
assert.deepEqual((await latestResponse.json()).indices.map(item => item.code), ['000922', '930955', '999999']);

const rejectedPost = await worker.fetch(new Request('https://shadow.test/latest', {method: 'POST'}), env);
assert.equal(rejectedPost.status, 405);

const pineResponse = await worker.fetch(new Request('https://shadow.test/api/shadow/pine/latest'), env);
assert.equal(pineResponse.status, 200);
const pinePayload = await pineResponse.json();
assert.equal(pinePayload.schemaVersion, 'pine_v7_shadow_v1');
assert.equal(pinePayload.shadowOnly, true);
assert.equal(pinePayload.productionScoreEffect, 'none');
assert.equal(pinePayload.tradeSemantics, 'none');
assert.equal(pinePayload.meta.kvWrites, 0);
assert.deepEqual(pinePayload.indices.map(item => item.code), ['000922', '930955']);
assert.equal(pinePayload.indices.every(item => item.pineV7.engineVersion === 'pine-v7-red-rocket-final'), true);

const weekend = await worker.fetch(new Request('https://shadow.test/history/calculate?code=000922&date=2026-07-12'), env);
assert.equal(weekend.status, 422);
assert.equal((await weekend.json()).error, 'DATE_UNAVAILABLE');

const wrongCode = await worker.fetch(new Request('https://shadow.test/history/calculate?code=123456&date=2026-07-14'), env);
assert.equal(wrongCode.status, 400);
assert.equal((await wrongCode.json()).error, 'UNSUPPORTED_CODE');

const originalFetch = globalThis.fetch;
globalThis.fetch = async url => {
  const parsed = new URL(url instanceof Request ? url.url : url);
  const code = parsed.searchParams.get('code');
  const date = parsed.searchParams.get('date');
  if (date === '2026-01-02') return new Response(JSON.stringify({error: 'DATE_NOT_FOUND', code, date}), {status: 404});
  return new Response(JSON.stringify({
    code, date, name: 'mock', source: 'historical_calculation', notLatest: true, notArchive: true,
    valuation: {}, macro: {}, technical: {}, pine: {}, metadata: {},
  }), {status: 200});
};
try {
  for (const code of ['000922', '930955', '999999']) {
    const response = await worker.fetch(new Request(`https://shadow.test/history/calculate?code=${code}&date=2026-07-14`), env);
    assert.equal(response.status, 200, `${code} must use registry-driven history`);
  }
  const missing = await worker.fetch(new Request('https://shadow.test/history/calculate?code=999999&date=2026-01-02'), env);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, 'DATE_NOT_FOUND');
} finally {
  globalThis.fetch = originalFetch;
}

const insufficientRegistry = structuredClone(registry);
insufficientRegistry.indices[2].dataStatus.history = 'insufficient';
const insufficient = await worker.fetch(
  new Request('https://shadow.test/history/calculate?code=999999&date=2026-07-14'),
  {...env, INDEX_REGISTRY_JSON: insufficientRegistry},
);
assert.equal(insufficient.status, 422);
assert.equal((await insufficient.json()).error, 'INSUFFICIENT_HISTORY');

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /id="index-selector"/);
assert.match(html, /id="index-code-search"/);
assert.match(html, /DividendIndexManagement\.load\(DATA_API_DIV/);
assert.doesNotMatch(html, /id="btn-(000922|930955)"/);
assert.doesNotMatch(html, /selectIndex\('(000922|930955)'/);
assert.match(html, /@media\(max-width:479px\)/);
assert.match(html, /该指数未接入。/);
assert.match(html, /indexActivationId/);
assert.match(html, /PineScoreResolver\.render/);
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .filter(match => !/type="application\/json"/i.test(match[0]))
  .map(match => match[1]);
for (const source of inlineScripts) new Function(source);

console.log('V1.3 index management: registry, dropdown/search model, switching routes, mock index, typed errors and static mobile contract passed');
