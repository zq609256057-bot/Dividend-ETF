import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../../production_deploy/worker.js', import.meta.url), 'utf8');
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const worker = workerModule.default;

class MemoryKV {
  constructor() { this.values = new Map(); }
  async get(key, options) {
    const value = this.values.get(key);
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
  async put(key, value) { this.values.set(key, value); }
}

const base = JSON.parse(fs.readFileSync(new URL('../../local_data_collector/output/dividend_indices_latest.json', import.meta.url), 'utf8'));
const kv = new MemoryKV();
const env = {DIVIDEND_SNAPSHOTS: kv, SNAPSHOT_ADMIN_TOKEN: 'test-token'};
const dates = ['2026-07-10', '2026-07-13', '2026-07-14'];
const guardedHeaders = {
  Authorization: 'Bearer test-token',
  'Content-Type': 'application/json',
  'X-KV-Allow-Write': 'true',
  'X-KV-Puts-Used-Today': '0',
};

const missingApproval = await worker.fetch(new Request('https://worker.test/admin/snapshot', {
  method: 'PUT', headers: {Authorization: 'Bearer test-token', 'Content-Type': 'application/json'}, body: JSON.stringify(base),
}), env);
assert.equal(missingApproval.status, 403);
assert.equal((await missingApproval.json()).error, 'KV_WRITE_AUTHORIZATION_REQUIRED');

const unknownQuota = await worker.fetch(new Request('https://worker.test/admin/snapshot', {
  method: 'PUT', headers: {...guardedHeaders, 'X-KV-Puts-Used-Today': 'unknown'}, body: JSON.stringify(base),
}), env);
assert.equal(unknownQuota.status, 400);
assert.equal((await unknownQuota.json()).error, 'kv_quota_usage_unknown');

const blockedQuota = await worker.fetch(new Request('https://worker.test/admin/snapshot', {
  method: 'PUT', headers: {...guardedHeaders, 'X-KV-Puts-Used-Today': '946'}, body: JSON.stringify(base),
}), env);
assert.equal(blockedQuota.status, 429);
assert.equal((await blockedQuota.json()).error, 'KV_QUOTA_GUARD_BLOCKED');

for (const date of dates) {
  const snapshot = structuredClone(base);
  snapshot.as_of_date = date;
  snapshot.indices.forEach(item => {
    item.kline.date = date;
    item.valuation.date = date;
    if (item.technical) item.technical.date = date;
    if (item.macro) { item.macro.valuationDate = date; item.macro.macroDate = date; }
  });
  const upload = await worker.fetch(new Request('https://worker.test/admin/snapshot', {
    method: 'PUT', headers: guardedHeaders, body: JSON.stringify(snapshot)
  }), env);
  assert.equal(upload.status, 200, `upload ${date}`);
  assert.equal((await upload.json()).stored_history_date, true);
}

const beforeDuplicate = kv.values.size;
const duplicateSnapshot = structuredClone(base);
duplicateSnapshot.as_of_date = dates.at(-1);
duplicateSnapshot.indices.forEach(item => {
  item.kline.date = dates.at(-1);
  item.valuation.date = dates.at(-1);
  if (item.technical) item.technical.date = dates.at(-1);
  if (item.macro) { item.macro.valuationDate = dates.at(-1); item.macro.macroDate = dates.at(-1); }
});
const duplicate = await worker.fetch(new Request('https://worker.test/admin/snapshot', {
  method: 'PUT', headers: guardedHeaders, body: JSON.stringify(duplicateSnapshot),
}), env);
assert.equal(duplicate.status, 200);
assert.equal((await duplicate.json()).status, 'SKIPPED_DUPLICATE_PAYLOAD');
assert.equal(kv.values.size, beforeDuplicate, 'duplicate payload must not add KV keys');

for (const date of dates) {
  const response = await worker.fetch(new Request(`https://worker.test/archive?index=930955&date=${date}`), env);
  assert.equal(response.status, 200, `archive ${date}`);
  const body = await response.json();
  assert.equal(body.data[0].as_of_date, date);
  assert.equal(body.index, '930955');
}

assert.equal((await worker.fetch(new Request('https://worker.test/archive?index=930955&date=2020-01-02'), env)).status, 404);
assert.equal((await worker.fetch(new Request('https://worker.test/archive?index=930955&date=bad-date'), env)).status, 400);
await kv.put('div_archive:930955', JSON.stringify([{date: '2026-07-09', price: 10888, sma250: 10900}]));
const legacy = await worker.fetch(new Request('https://worker.test/archive?index=930955&date=2026-07-09'), env);
assert.equal(legacy.status, 200);
assert.equal((await legacy.json()).data[0].price, 10888);
console.log('Production Worker history: guarded upload failures, duplicate skip, 3 dates, not-found and invalid-date responses passed');
