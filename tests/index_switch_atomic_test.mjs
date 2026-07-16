import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const atomic = require('../index_switch_atomic.js');
const repo = new URL('../', import.meta.url);
const workspace = new URL('../../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', repo), 'utf8');
const canonical = fs.readFileSync(new URL('HTML/index.html', workspace), 'utf8');

assert.equal(html, canonical, 'HTML and Pages candidates must remain byte-identical');
assert.deepEqual(atomic.STATES, {IDLE:'IDLE', LOADING:'LOADING', READY:'READY', ERROR:'ERROR'});

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return {promise, resolve, reject};
};

const pending = new Map();
const view = {title:null, fields:{price:'OLD', did:'OLD', technical:'OLD'}, total:'60.25', identity:'930955', state:'IDLE', error:null};
const controller = atomic.create({
  isAllowed: code => ['000922','930955'].includes(code),
  begin: code => {
    view.title = code;
    view.fields = {price:'', did:'', technical:''};
    view.total = '--';
    view.identity = null;
    view.error = null;
  },
  load: code => {
    const item = deferred();
    pending.set(code + ':' + (pending.size + 1), item);
    return item.promise;
  },
  matches: (data, code) => data.code === code,
  commit: (data, code) => {
    view.fields = {...data.fields};
    view.identity = code;
  },
  fail: error => { view.error = error.message; },
  onState: state => { view.state = state; },
});

const first = controller.switchIndex('000922');
assert.equal(view.title, '000922');
assert.deepEqual(view.fields, {price:'', did:'', technical:''}, 'old fields clear synchronously');
assert.equal(view.total, '--', 'old total clears synchronously');
assert.equal(view.state, 'LOADING');
pending.get('000922:1').resolve({code:'000922', fields:{price:'5307.5', did:'4.421', technical:'A'}});
assert.equal((await first).ok, true);
assert.equal(view.identity, '000922');
assert.equal(view.state, 'READY');

const wrong = controller.switchIndex('930955');
pending.get('930955:2').resolve({code:'000922', fields:{price:'WRONG', did:'WRONG', technical:'WRONG'}});
const wrongResult = await wrong;
assert.equal(wrongResult.ok, false);
assert.equal(view.state, 'ERROR');
assert.equal(view.identity, null);
assert.deepEqual(view.fields, {price:'', did:'', technical:''}, 'wrong-code response cannot restore old data');

const rapidA = controller.switchIndex('000922');
const rapidB = controller.switchIndex('930955');
const rapidC = controller.switchIndex('000922');
const keys = [...pending.keys()];
pending.get(keys[2]).resolve({code:'000922', fields:{price:'STALE-A', did:'STALE-A', technical:'STALE-A'}});
pending.get(keys[3]).resolve({code:'930955', fields:{price:'STALE-B', did:'STALE-B', technical:'STALE-B'}});
pending.get(keys[4]).resolve({code:'000922', fields:{price:'FINAL', did:'FINAL', technical:'FINAL'}});
const rapidResults = await Promise.all([rapidA, rapidB, rapidC]);
assert.equal(rapidResults[0].stale, true);
assert.equal(rapidResults[1].stale, true);
assert.equal(rapidResults[2].ok, true);
assert.equal(view.identity, '000922');
assert.equal(view.fields.price, 'FINAL', 'only the final rapid-switch response may commit');

const failed = controller.switchIndex('930955');
pending.get('930955:6').reject(new Error('latest unavailable'));
assert.equal((await failed).ok, false);
assert.equal(view.state, 'ERROR');
assert.equal(view.total, '--');
assert.equal(view.fields.price, '');

for (const marker of [
  'var indexActivationId=0',
  'if(indexActivationController)indexActivationController.abort()',
  'captureIndexRequestIdentity(code)',
  'requestIdentity.activationId===indexActivationId',
  'requestIdentity.requestedIndexCode===_selIndex',
  'clearAll()',
  'signal:requestIdentity.signal',
  'if(!isCurrentIndexRequest(requestIdentity))return false',
  'applyDivData(data,{force:true,historical:true,requestIdentity:requestIdentity})',
  'discarded stale assistant fill',
  "localStorage.getItem('div_sel_index')",
]) assert.ok(html.includes(marker), `missing atomic integration marker: ${marker}`);

assert.match(html, /selector\.onchange=function\(\)\{activateIndex\(selector\.value\);\}/);
assert.match(html, /Manual Override → Python Auto → Manual Input/);
assert.match(html, /var pineResolution=resolvePineScore\(\);/);
assert.match(html, /techTotal\+=tech3/);
assert.match(html, /trendBonus=Math\.max\(-2,Math\.min\(3,trendBonus\)\)/);
assert.match(html, /total=Math\.max\(0,Math\.min\(100,total\+trendBonus\)\)/);

const sha = path => crypto.createHash('sha256').update(fs.readFileSync(new URL(path, workspace))).digest('hex');
assert.equal(sha('research_pine_engine/composite_v7.py'), '2934b556981283b8b1e2fc3fb5bc626b095ee5111900824bb72f94351660ca55');
assert.equal(sha('local_data_collector/config/scoring_rules.json'), '98146e82f17a273c6d96c064033c18f3ada98a6a5e73d48ae7cf355fe06de022');
// Cloudflare KV Safety Governance approved the guard-only Worker baseline.
assert.equal(sha('production_deploy/worker.js'), '6074e0e5dc66cc9b5d9d9e73318ca583f3b2aaf8396ba5b8941ec102ce85aae3');

const backupManifest = JSON.parse(fs.readFileSync(new URL('PINE_INDEX_SWITCH_FIX_BACKUP_MANIFEST.json', repo), 'utf8'));
for (const item of backupManifest.files) {
  const backup = fs.readFileSync(new URL(item.backup, workspace));
  assert.equal(crypto.createHash('sha256').update(backup).digest('hex'), item.sha256, `backup hash: ${item.backup}`);
  assert.equal(backup.byteLength, item.size, `backup size: ${item.backup}`);
}
assert.equal(backupManifest.kvWrites, 0);

console.log('Index switch atomic: controller race model, V1.3 activation identity, abort/stale guards, scoring freeze and frozen assets PASS');
