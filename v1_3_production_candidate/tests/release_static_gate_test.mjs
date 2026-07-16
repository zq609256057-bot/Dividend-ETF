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
const historyAdapter = text('public/history_backfill_candidate_adapter.js');
const manifest = JSON.parse(text('release_manifest.json'));
const productionHtml = text('../index.html');
const productionManager = text('../index_management.js');
const productionHistoryAdapter = text('../history_backfill_production_adapter.js');

assert.equal(registry.schemaVersion, 'dividend_index_registry_v2');
assert.deepEqual(registry.indices.filter(item => item.enabled).map(item => item.code), ['000922', '930955']);
assert.equal(registry.indices.some(item => item.enabled === false), false);
assert.equal(hash('public/index_management.js'), hash('../v1_3_shadow/public/index_management.js'));
const shadowHtml = text('../v1_3_shadow/public/index.html');
const normalizedCandidateHtml = html
  .replace('V1.3 Production Candidate', 'V1.3 Shadow')
  .replaceAll('v1_3_production_candidate_history', 'v1_3_shadow_history')
  .replace('Production Candidate 始终使用浏览器本地历史', 'Shadow HTML 始终使用浏览器本地历史')
  .replace('Candidate本地历史保存失败', 'Shadow本地历史保存失败')
  .replace('<script src="history_backfill_candidate_adapter.js"></script>', '<script src="https://zq609256057-bot.github.io/Dividend-ETF/history_backfill_shadow_adapter.js"></script>');
const runtimePattern = /<script>\nvar STORAGE_KEY=[\s\S]*?<\/script>\n\n<!-- 数据来源 -->/;
const shell = source => source.replace(runtimePattern, '<script>\n[INDEX_IDENTITY_RUNTIME]\n</script>\n\n<!-- 数据来源 -->');
assert.equal(shell(normalizedCandidateHtml), shell(shadowHtml), 'Candidate HTML/CSS/Pine shell must remain the accepted Shadow shell');
const functionSection = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
assert.equal(
  functionSection(normalizedCandidateHtml, 'function calcScore(){', 'function saveRecord'),
  functionSection(shadowHtml, 'function calcScore(){', 'function saveRecord'),
  'Historical identity repair must not change the scoring function',
);

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
assert.match(html, /function captureIndexRequestIdentity\(requestedIndexCode\)/);
assert.match(html, /requestIdentity\.activationId===indexActivationId&&requestIdentity\.requestedIndexCode===_selIndex/);
assert.match(html, /loadHistoricalData\(date,requestIdentity\)/);
assert.match(html, /signal:requestIdentity&&requestIdentity\.signal/);
assert.match(html, /applyDivData\(data,\{force:true,historical:true,requestIdentity:requestIdentity\}\)/);
assert.match(html, /options\.requestIdentity&&!isCurrentIndexRequest\(options\.requestIdentity\)/);
assert.match(html, /discarded stale assistant fill/);
assert.match(html, /<script src="history_backfill_candidate_adapter\.js"><\/script>/);
assert.doesNotMatch(html, /<script src="https:\/\/zq609256057-bot\.github\.io\/Dividend-ETF\/history_backfill_shadow_adapter\.js"><\/script>/);
assert.match(historyAdapter, /payload\.code!==requestCode/);
assert.match(historyAdapter, /signal:requestIdentity\.signal/);
assert.match(historyAdapter, /if\(override&&override\.checked\)return originalResolve\(\);/);
assert.match(historyAdapter, /requestId===currentRequestId&&isCurrent\(identity\)/);
assert.match(historyAdapter, /DEFAULT_LABEL='查询历史'/);
assert.match(historyAdapter, /LOADING_LABEL='⏳ 计算中\.\.\.'/);
assert.doesNotMatch(historyAdapter, /original=button|button\?button\.textContent/);
assert.doesNotMatch(historyAdapter, /DIVIDEND_SNAPSHOTS|admin\/snapshot|\.put\(/);
const normalizedProductionHtml = productionHtml
  .replace('V1.3 Production</title>', 'V1.3 Production Candidate</title>')
  .replaceAll('v1_3_production_history', 'v1_3_production_candidate_history')
  .replace('Production 始终使用浏览器本地历史', 'Production Candidate 始终使用浏览器本地历史')
  .replace('Production本地历史保存失败', 'Candidate本地历史保存失败')
  .replace("var DEPLOYMENT_PRODUCTION_URL = 'https://dividend-dashboard-api.zq609256057.workers.dev';\nvar DATA_API_DIV = window.DIVIDEND_SNAPSHOT_API || LOCAL_SNAPSHOT_API || DEPLOYMENT_PRODUCTION_URL;", "var DEPLOYMENT_CANDIDATE_URL = location.origin;\nvar DATA_API_DIV = window.DIVIDEND_SNAPSHOT_API || LOCAL_SNAPSHOT_API || DEPLOYMENT_CANDIDATE_URL;")
  .replace("apiUrl:DEPLOYMENT_PRODUCTION_URL+'/api/shadow/pine/latest'", "apiUrl:location.origin+'/api/shadow/pine/latest'")
  .replace('<script src="history_backfill_production_adapter.js"></script>', '<script src="history_backfill_candidate_adapter.js"></script>');
assert.equal(normalizedProductionHtml, html, 'Production Pages HTML must be the accepted Candidate shell with only audited runtime substitutions');
assert.equal(productionManager, manager, 'Production Index Manager must be byte-identical to Candidate');
assert.equal(productionHistoryAdapter.replaceAll('DividendHistoryProduction', 'DividendHistoryCandidate'), historyAdapter, 'Production history adapter must be behavior-identical to the accepted Candidate at cutover');
for (const [file, expected] of Object.entries(manifest.files)) assert.equal(hash(file), expected, `release manifest hash: ${file}`);
const protectedPaths = {
  'pine_score_resolver.js': '../pine_score_resolver.js',
  'composite_v7.py': '../../research_pine_engine/composite_v7.py',
  'scoring_rules.json': '../../local_data_collector/config/scoring_rules.json',
  'kv_guarded_production_worker.js': '../../production_deploy/worker.js',
};
for (const [name, file] of Object.entries(protectedPaths)) assert.equal(hash(file), manifest.protectedHashes[name], `protected hash: ${name}`);
assert.equal(manifest.protectedHashes['production_index.html'], 'aba90da354c1c6de15e0c95c92c7cecf9a59f769c66a7b3299835bd71db24a97', 'rollback Pages hash must remain recorded');
for (const [file, expected] of Object.entries(manifest.productionReleaseFiles)) assert.equal(hash(file), expected, `production release hash: ${file}`);

console.log('V1.3 production release gate: accepted Candidate equivalence, production runtime substitutions, scoring freeze and bounded Worker configuration passed');
