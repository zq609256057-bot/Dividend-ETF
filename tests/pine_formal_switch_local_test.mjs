import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const repo = new URL('../', import.meta.url);
const workspace = new URL('../../', import.meta.url);
const repoHtml = fs.readFileSync(new URL('index.html', repo), 'utf8');
const canonicalHtml = fs.readFileSync(new URL('HTML/index.html', workspace), 'utf8');
const config = fs.readFileSync(new URL('pine_auto_config.js', repo), 'utf8');
const resolver = fs.readFileSync(new URL('pine_score_resolver.js', repo), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('PINE_FORMAL_SWITCH_BACKUP_MANIFEST.json', repo), 'utf8'));

assert.equal(repoHtml, canonicalHtml, 'canonical and Pages formal HTML must match');
assert.match(config, /PINE_AUTO_ENABLED:true/);
assert.match(config, /engineVersion:'pine-v7-red-rocket-final'/);

const calc = repoHtml.split('function calcScore(){', 2)[1].split('function saveRecord', 1)[0];
assert.ok(calc, 'calcScore must exist');
assert.match(calc, /var pineResolution=resolvePineScore\(\);/);
assert.match(calc, /techTotal\+=tech3/);
assert.doesNotMatch(calc, /parseInt\(gv\('e_tech3'\)\)/);
assert.match(calc, /g\('subtotal-val'\).*' \/ 60'/);
assert.match(calc, /g\('subtotal-tech'\).*' \/ 40'/);
assert.match(calc, /total=valTotal\+techTotal/);
assert.match(calc, /trendBonus=Math\.max\(-2,Math\.min\(3,trendBonus\)\)/);
assert.match(calc, /total=Math\.max\(0,Math\.min\(100,total\+trendBonus\)\)/);
assert.match(calc, /f\.e_tech3=String\(tech3\)/, 'history must save effective Resolver score');
assert.match(calc, /f\.e_tech3_manual=storedInputValue\('e_tech3'\)/, 'history must retain manual input');
assert.match(calc, /f\.pine_resolution=/, 'history must retain Resolver provenance');

assert.match(repoHtml, /<button class="btn-calc" onclick="calcScore\(\)"/);
assert.match(repoHtml, /window\.PINE_AUTO_CONFIG=Object\.freeze\(\{PINE_AUTO_ENABLED:true,apiUrl:DEPLOYMENT_PRODUCTION_URL\+'\/api\/shadow\/pine\/latest'/);
assert.match(repoHtml, /<script src="https:\/\/zq609256057-bot\.github\.io\/Dividend-ETF\/pine_score_resolver\.js"><\/script>/);
assert.match(repoHtml, /<script src="history_backfill_production_adapter\.js"><\/script>/);
assert.match(repoHtml, /localStorage\.getItem\('div_sel_index'\)/, 'refresh must restore index selection');
assert.match(resolver, /render\(\);refresh\(\);/, 'page initialization must refresh Auto Pine');
assert.ok(resolver.indexOf('if(override&&Number.isFinite(manual))') < resolver.indexOf('if(config.PINE_AUTO_ENABLED&&payload)'));

for (const marker of [
  'value.ok!==true', 'schemaVersion', 'shadowOnly', 'pineV7.score',
  'engineVersion', 'Pine data expired', 'later than current trading date',
]) assert.ok(resolver.includes(marker), `missing Resolver gate: ${marker}`);

for (const item of manifest.files) {
  const backup = fs.readFileSync(new URL(item.backupPath, workspace));
  assert.equal(crypto.createHash('sha256').update(backup).digest('hex'), item.sha256, `formal backup changed: ${item.backupPath}`);
  assert.equal(backup.byteLength, item.size, `formal backup size changed: ${item.backupPath}`);
  assert.equal(item.backupMatches, true);
  if(!item.path.endsWith('index.html')){
    const source = fs.readFileSync(new URL(item.path.replace('github_pages_repo/', ''), item.path.startsWith('github_pages_repo/') ? repo : workspace));
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'), item.sha256, `frozen Pine asset changed: ${item.path}`);
  }
}

assert.match(repoHtml, /function captureIndexRequestIdentity\(requestedIndexCode\)/);
assert.match(repoHtml, /requestIdentity\.activationId===indexActivationId&&requestIdentity\.requestedIndexCode===_selIndex/);
assert.match(repoHtml, /applyDivData\(data,\{force:true,historical:true,requestIdentity:requestIdentity\}\)/);
assert.match(repoHtml, /signal:requestIdentity\.signal/);

console.log('Pine formal switch: V1.3 production HTML, flag, Resolver gates, scoring formula, index identity guard, frozen Pine assets and backup integrity PASS');
