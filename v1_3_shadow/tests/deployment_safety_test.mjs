import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = new URL('../', import.meta.url);
const worker = fs.readFileSync(new URL('worker.mjs', base), 'utf8');
const wrangler = fs.readFileSync(new URL('wrangler.shadow.toml', base), 'utf8');
const registry = JSON.parse(fs.readFileSync(new URL('index_registry.json', base), 'utf8'));
const html = fs.readFileSync(new URL('index.html', base), 'utf8');
const publicHtml = fs.readFileSync(new URL('public/index.html', base), 'utf8');
const manager = fs.readFileSync(new URL('index_management.js', base), 'utf8');
const publicManager = fs.readFileSync(new URL('public/index_management.js', base), 'utf8');
const pineSnapshot = JSON.parse(fs.readFileSync(new URL('output/pine_shadow_latest.canonical.json', base), 'utf8'));

assert.match(wrangler, /^name = "dividend-dashboard-api-v1-3-shadow"$/m);
assert.match(wrangler, /^main = "worker\.mjs"$/m);
assert.match(wrangler, /^directory = "\.\/public"$/m);
assert.doesNotMatch(wrangler, /kv_namespaces|DIVIDEND_SNAPSHOTS|HISTORY_CACHE|DIVIDEND_V1_3_SHADOW_KV/);
assert.match(wrangler, /binding = "HISTORY_ENGINE"/);
assert.match(wrangler, /service = "dividend-dashboard-api"/);
assert.doesNotMatch(worker, /\.put\s*\(|DIVIDEND_SNAPSHOTS|HISTORY_CACHE/);
assert.match(worker, /kvWrites:\s*0/);
assert.match(worker, /request\.method !== 'GET'/);
assert.match(worker, /new Request\(endpoint, \{method: 'GET'/);
assert.equal(html, publicHtml, 'deployed HTML must match audited Shadow HTML');
assert.equal(manager, publicManager, 'deployed index manager must match audited source');
assert.doesNotMatch(html, /fetch\([^\n]+method\s*:\s*['"]POST['"]/);
assert.match(html, /localStorage\.setItem\(API_KEY/);
assert.equal(registry.schemaVersion, 'dividend_index_registry_v2');
assert.deepEqual(registry.indices.filter(item => item.enabled).map(item => item.code), ['000922', '930955']);
assert.equal(registry.indices.some(item => item.code === '999999'), false);
assert.deepEqual(pineSnapshot.indices.map(item => item.code), ['000922', '930955']);
assert.equal(pineSnapshot.indices.every(item => item.technical_shadow?.pineV7?.engineVersion === 'pine-v7-red-rocket-final'), true);
assert.equal(pineSnapshot.indices.every(item => item.technical_shadow?.riskLabel?.scoreEffect === 'none'), true);

console.log('V1.3 Shadow deployment safety: isolated name, zero KV binding/write, GET-only runtime, production-only real registry and audited assets passed');
