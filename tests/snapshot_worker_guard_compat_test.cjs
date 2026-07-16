#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const workerSource = fs.readFileSync(path.join(root, 'production_deploy/worker.js'), 'utf8');
const snapshot = JSON.parse(fs.readFileSync(
  path.join(root, 'local_data_collector/output/dividend_indices_latest.json'),
  'utf8',
));
const approvedSnapshot = structuredClone(snapshot);

class MemoryKV {
  constructor() { this.values = new Map(); }
  async put(key, value) { this.values.set(key, value); }
  async get(key, options) {
    const value = this.values.get(key);
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
}

async function loadWorker() {
  return import(`data:text/javascript;base64,${Buffer.from(workerSource).toString('base64')}`);
}

(async () => {
  const worker = await loadWorker();
  const kv = new MemoryKV();
  const env = { DIVIDEND_SNAPSHOTS: kv, SNAPSHOT_ADMIN_TOKEN: 'local-test-token' };
  const guardedHeaders = {
    Authorization: 'Bearer local-test-token',
    'Content-Type': 'application/json',
    'X-KV-Allow-Write': 'true',
    'X-KV-Puts-Used-Today': '0',
  };

  const uninitializedHealth = await worker.default.fetch(
    new Request('https://local.invalid/health'),
    env,
  );
  assert.strictEqual(uninitializedHealth.status, 200);
  assert.strictEqual((await uninitializedHealth.json()).status, 'not_initialized');

  const unauthorized = await worker.default.fetch(new Request('https://local.invalid/admin/snapshot', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approvedSnapshot),
  }), env);
  assert.strictEqual(unauthorized.status, 401);

  const missingApproval = await worker.default.fetch(new Request('https://local.invalid/admin/snapshot', {
    method: 'PUT', headers: { Authorization: 'Bearer local-test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(approvedSnapshot),
  }), env);
  assert.strictEqual(missingApproval.status, 403);
  assert.strictEqual((await missingApproval.json()).error, 'KV_WRITE_AUTHORIZATION_REQUIRED');

  const unknownQuota = await worker.default.fetch(new Request('https://local.invalid/admin/snapshot', {
    method: 'PUT', headers: { ...guardedHeaders, 'X-KV-Puts-Used-Today': 'unknown' }, body: JSON.stringify(approvedSnapshot),
  }), env);
  assert.strictEqual(unknownQuota.status, 400);
  assert.strictEqual((await unknownQuota.json()).error, 'kv_quota_usage_unknown');

  const blockedQuota = await worker.default.fetch(new Request('https://local.invalid/admin/snapshot', {
    method: 'PUT', headers: { ...guardedHeaders, 'X-KV-Puts-Used-Today': '946' }, body: JSON.stringify(approvedSnapshot),
  }), env);
  assert.strictEqual(blockedQuota.status, 429);
  assert.strictEqual((await blockedQuota.json()).error, 'KV_QUOTA_GUARD_BLOCKED');

  const wrongSchema = structuredClone(approvedSnapshot);
  wrongSchema.schema_version = 'not-v1';
  const rejected = await worker.default.fetch(new Request('https://local.invalid/admin/snapshot', {
    method: 'PUT', headers: guardedHeaders, body: JSON.stringify(wrongSchema),
  }), env);
  assert.strictEqual(rejected.status, 400);

  const upload = await worker.default.fetch(new Request('https://local.invalid/admin/snapshot', {
    method: 'PUT',
    headers: guardedHeaders,
    body: JSON.stringify(approvedSnapshot),
  }), env);
  assert.strictEqual(upload.status, 200);
  const uploadBody = await upload.json();
  assert.strictEqual(uploadBody.stored_latest, true);
  assert.strictEqual(uploadBody.stored_last_success, true);

  const beforeDuplicate = kv.values.size;
  const duplicate = await worker.default.fetch(new Request('https://local.invalid/admin/snapshot', {
    method: 'PUT', headers: guardedHeaders, body: JSON.stringify(approvedSnapshot),
  }), env);
  assert.strictEqual(duplicate.status, 200);
  assert.strictEqual((await duplicate.json()).status, 'SKIPPED_DUPLICATE_PAYLOAD');
  assert.strictEqual(kv.values.size, beforeDuplicate);

  const latestResponse = await worker.default.fetch(new Request('https://local.invalid/latest'), env);
  assert.strictEqual(latestResponse.status, 200);
  const latest = await latestResponse.json();
  assert.deepStrictEqual(latest.indices.map(item => item.code), ['000922', '930955']);
  assert(latest.indices.every(item => item.technical?.rsiMethod === 'wilder_rsi_14'));
  assert(latest.indices.every(item => item.macro?.source === 'lixinger_macro_national_debt'));

  const health = await worker.default.fetch(new Request('https://local.invalid/health'), env);
  assert.strictEqual(health.status, 200);
  const healthBody = await health.text();
  assert.strictEqual(JSON.parse(healthBody).status, 'ok');
  assert(!healthBody.includes('local-test-token'));

  for (const item of approvedSnapshot.indices) {
    const response = await worker.default.fetch(
      new Request(`https://local.invalid/dividend-data?index=${item.code}`),
      env,
    );
    assert.strictEqual(response.status, 200);
    const adapted = await response.json();
    assert.strictEqual(adapted.current_price, item.kline.close);
    assert.strictEqual(adapted.price, item.kline.close);
    assert.strictEqual(adapted.price_unit, 'index_points');
    assert.strictEqual(adapted.did, item.valuation.dividend_yield);
    assert.strictEqual(adapted.dividend_yield, item.valuation.dividend_yield);
    assert.strictEqual(adapted.did_percentile_full_history, item.valuation.didPercentileFullHistory);
    assert.strictEqual(adapted.pb, item.valuation.pb);
    assert.strictEqual(adapted.pe_ttm, item.valuation.pe_ttm);
    assert.strictEqual(adapted.roe, null);
    assert.strictEqual(adapted.roe_implied_ttm, item.valuation.roeImpliedTtm);
    assert.strictEqual(adapted.cn10y, item.macro.cn10yYield);
    assert.strictEqual(adapted.yield_spread, item.macro.yieldSpread);
    assert.strictEqual(adapted.yield_spread_percentile, item.macro.yieldSpreadPercentile);
    assert.strictEqual(adapted.update_time, item.update_time);
    assert.strictEqual(adapted.sma60, item.technical.sma60);
    assert.strictEqual(adapted.rsi14, item.technical.rsi14);
    assert.strictEqual(adapted.volume_ratio_5d, item.technical.volumeRatio5d);
    assert.strictEqual(adapted.volume_status, item.technical.volumeStatus);
    assert.strictEqual(adapted.price_position_252, item.technical.pricePosition252);
  }

  const lastSuccess = await worker.default.fetch(new Request('https://local.invalid/last-success'), env);
  assert.strictEqual(lastSuccess.status, 200);
  assert.strictEqual((await lastSuccess.json()).schema_version, 'dividend_indices_snapshot_v1');
  const rollbackV1 = structuredClone(approvedSnapshot);
  rollbackV1.indices.forEach(item => delete item.technical);
  rollbackV1.indices.forEach(item => delete item.macro);
  assert.deepStrictEqual(worker.validateCanonicalSnapshot(rollbackV1), []);
  console.log('PASS: snapshot upload/latest/last-success/health and two-index adapter');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
