import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const base = new URL('../', import.meta.url);
const text = name => fs.readFileSync(new URL(name, base), 'utf8');
const hash = name => crypto.createHash('sha256').update(fs.readFileSync(new URL(name, base))).digest('hex');
const registry = JSON.parse(text('index_registry.json'));
const worker = text('worker.mjs');
const wrangler = text('wrangler.production-candidate.toml');
const html = text('public/index.html');
const manager = text('public/index_management.js');

assert.equal(registry.schemaVersion, 'dividend_index_registry_v2');
assert.deepEqual(registry.indices.filter(item => item.enabled).map(item => item.code), ['000922', '930955']);
assert.equal(registry.indices.some(item => item.enabled === false), false);
assert.equal(hash('public/index_management.js'), hash('../v1_3_shadow/public/index_management.js'));
const shadowHtml = text('../v1_3_shadow/public/index.html');
const normalizedCandidateHtml = html
  .replace('V1.3 Production Candidate', 'V1.3 Shadow')
  .replaceAll('v1_3_production_candidate_history', 'v1_3_shadow_history')
  .replace('Production Candidate 始终使用浏览器本地历史', 'Shadow HTML 始终使用浏览器本地历史')
  .replace('Candidate本地历史保存失败', 'Shadow本地历史保存失败');
assert.equal(normalizedCandidateHtml, shadowHtml, 'Candidate HTML may differ from accepted Shadow only by local diagnostic labels');

assert.match(wrangler, /^name = "dividend-dashboard-api-v1-3-production-candidate"$/m);
assert.doesNotMatch(wrangler, /^name = "dividend-dashboard-api"$/m);
assert.match(wrangler, /^DEPLOYMENT_ENVIRONMENT = "candidate"$/m);
assert.doesNotMatch(wrangler, /^DEPLOYMENT_ENVIRONMENT = "production"$/m);
assert.match(wrangler, /binding = "DIVIDEND_SNAPSHOTS"/);
assert.match(wrangler, /id = "__PRODUCTION_KV_NAMESPACE_ID__"/);
assert.doesNotMatch(wrangler, /DIVIDEND_SHADOW_KV|HISTORY_ENGINE|SNAPSHOT_ADMIN_TOKEN\s*=/);
assert.doesNotMatch(wrangler, /^routes?\s*=|\[\[routes\]\]|\[triggers\]/m);

assert.match(worker, /KV_WRITE_AUTHORIZATION_REQUIRED/);
assert.match(worker, /KV_QUOTA_GUARD_BLOCKED/);
assert.match(worker, /SKIPPED_DUPLICATE_PAYLOAD/);
assert.match(worker, /HISTORY_CACHE_KEY_PREFIX/);
assert.match(worker, /url\.pathname === '\/archive'/);
assert.match(worker, /url\.pathname === '\/dividend-data'/);
assert.match(worker, /env\.DIVIDEND_SNAPSHOTS\.put/);
assert.doesNotMatch(worker, /setInterval|setTimeout|scheduled\s*\(/);
assert.match(worker, /environment === 'candidate'/);
assert.match(worker, /environment === 'production'/);
assert.match(worker, /DEPLOYMENT_ENVIRONMENT_REQUIRED/);
assert.match(worker, /DEPLOYMENT_ENVIRONMENT_INVALID/);

assert.match(html, /id="index-selector"/);
assert.match(html, /id="index-code-search"/);
assert.match(html, /DividendIndexManagement\.load\(DATA_API_DIV/);
assert.match(html, /该指数未接入。/);
assert.doesNotMatch(html, /id="btn-(000922|930955)"/);
assert.match(html, /Manual Override → Python Auto → Manual Input/);
assert.match(html, /pine-v7-red-rocket-final/);
assert.match(html, /tech3=Math\.min\(10,Math\.max\(0,Number\(pineResolution\.score\)\|\|0\)\)/);
assert.match(html, /subtotal-val'\)\.textContent=formatDisplayNumber\(valTotal\)\+' \/ 60'/);
assert.match(html, /subtotal-tech'\)\.textContent=formatDisplayNumber\(techTotal\)\+' \/ 40'/);
assert.match(html, /trendBonus=Math\.max\(-2,Math\.min\(3,trendBonus\)\)/);
assert.match(html, /total=Math\.max\(0,Math\.min\(100,total\+trendBonus\)\)/);
assert.match(html, /@media\(max-width:479px\)/);
assert.match(manager, /findByCode/);

console.log('V1.3 production candidate static gate: bounded Shadow HTML promotion, scoring freeze, no production route and no temporary binding passed');
