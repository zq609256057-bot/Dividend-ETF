import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

function section(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `missing section: ${start}`);
  return html.slice(from, to);
}

const guardSource = section('function captureIndexRequestIdentity', 'function selectIndex');
const fillSource = section('async function fillHistoricalDate', 'function autoFillHistoryDiv');
const loadSource = section('async function loadHistoricalData', 'async function fillHistoricalDate');
const latestSource = section('function fetchAndFillDiv', '// 冻结快照嵌套结构');
const applySource = section('function applyDivData', 'function showDivManualReminder');
const assistantSource = section("window.addEventListener('message'", '// 页面加载时检查localStorage');

assert.match(loadSource, /getIndexConfig\(requestCode\)/);
assert.match(loadSource, /signal:requestIdentity&&requestIdentity\.signal/);
assert.match(loadSource, /mapSnapshotIndexToFormData\(item,requestCode\)/);
assert.match(fillSource, /if\(!isCurrentIndexRequest\(requestIdentity\)\)return false;/);
assert.ok(fillSource.indexOf('if(!isCurrentIndexRequest(requestIdentity))return false;') < fillSource.indexOf('clearHistoricalAutoFields();'));
assert.match(fillSource, /requestIdentity:requestIdentity/);
assert.match(latestSource, /requestedIndexCode/);
assert.match(latestSource, /mapSnapshotIndexToFormData\(d,requestCode\)/);
assert.match(applySource, /options\.requestIdentity&&!isCurrentIndexRequest\(options\.requestIdentity\)/);
assert.match(assistantSource, /discarded stale assistant fill/);
assert.doesNotMatch(fillSource, /pine-manual-override-enabled|e_tech3|PineScoreResolver/);

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return {promise, resolve, reject};
}

function makeHarness() {
  const input = {value: '2026-07-14'};
  const button = {textContent: '⏮ 回填该日', disabled: false};
  const header = {value: 'UNCHANGED'};
  const state = {applied: [], cleared: 0, messages: [], errors: [], override: {enabled: true, score: 8}};
  const context = vm.createContext({
    indexActivationId: 1,
    indexActivationController: new AbortController(),
    _selIndex: '000922',
    AbortController,
    Object,
    String,
    Date,
    Promise,
    console: {error: (...args) => state.errors.push(args), warn: () => {}},
    g: id => ({'backfill-date-div': input, 'backfill-button-div': button, 'header-date': header}[id] || null),
    localToday: () => '2026-07-16',
    showMsg: message => state.messages.push(message),
    clearHistoricalAutoFields: () => { state.cleared += 1; },
    applyDivData: (data, options) => {
      if (!context.isCurrentIndexRequest(options.requestIdentity)) return false;
      state.applied.push({data, options});
      return true;
    },
    getIndexConfig: code => ({code, name: code === '000922' ? '中证红利' : '红利低波100'}),
    loadHistoricalData: async () => { throw new Error('test did not install a loader'); },
  });
  vm.runInContext(`${guardSource}\n${fillSource}`, context);
  return {context, state, input, button, header};
}

function switchIndex(harness, code, withAbort = true) {
  const {context} = harness;
  if (withAbort && context.indexActivationController) context.indexActivationController.abort();
  context.indexActivationId += 1;
  context._selIndex = code;
  context.indexActivationController = withAbort ? new AbortController() : null;
}

// 1. Normal historical load commits once to the captured index.
{
  const h = makeHarness();
  const item = deferred();
  h.context.loadHistoricalData = (date, identity) => {
    assert.equal(date, '2026-07-14');
    assert.equal(identity.activationId, 1);
    assert.equal(identity.requestedIndexCode, '000922');
    assert.equal(identity.signal, h.context.indexActivationController.signal);
    return item.promise;
  };
  const pending = h.context.fillHistoricalDate();
  item.resolve({index: '000922', marker: 'normal'});
  assert.equal(await pending, true);
  assert.equal(h.state.applied.length, 1);
  assert.equal(h.state.applied[0].data.index, '000922');
  assert.equal(h.header.value, '2026-07-14');
}

// 2. Switching during a request discards it even when AbortController is unavailable.
{
  const h = makeHarness();
  h.context.indexActivationController = null;
  const item = deferred();
  h.context.loadHistoricalData = () => item.promise;
  const pending = h.context.fillHistoricalDate();
  switchIndex(h, '930955', false);
  item.resolve({index: '000922', marker: 'no-abort-fallback'});
  assert.equal(await pending, false);
  assert.equal(h.state.applied.length, 0);
  assert.equal(h.header.value, 'UNCHANGED');
}

// 3. A late 000922 response cannot commit into 930955.
{
  const h = makeHarness();
  const item = deferred();
  h.context.loadHistoricalData = () => item.promise;
  const pending = h.context.fillHistoricalDate();
  switchIndex(h, '930955');
  item.resolve({index: '000922', marker: 'late-000922'});
  assert.equal(await pending, false);
  assert.deepEqual(h.state.applied, []);
}

// 4. A late 930955 response cannot commit into 000922.
{
  const h = makeHarness();
  switchIndex(h, '930955');
  const item = deferred();
  h.context.loadHistoricalData = () => item.promise;
  const pending = h.context.fillHistoricalDate();
  switchIndex(h, '000922');
  item.resolve({index: '930955', marker: 'late-930955'});
  assert.equal(await pending, false);
  assert.deepEqual(h.state.applied, []);
}

// 5. Rapid 000922 -> 930955 -> 000922 commits only the final activation.
{
  const h = makeHarness();
  const a = deferred(), b = deferred(), c = deferred();
  let loader = a;
  h.context.loadHistoricalData = () => loader.promise;
  const pendingA = h.context.fillHistoricalDate();
  switchIndex(h, '930955'); loader = b;
  const pendingB = h.context.fillHistoricalDate();
  switchIndex(h, '000922'); loader = c;
  const pendingC = h.context.fillHistoricalDate();
  a.resolve({index: '000922', marker: 'stale-a'});
  b.resolve({index: '930955', marker: 'stale-b'});
  c.resolve({index: '000922', marker: 'final-c'});
  assert.deepEqual(await Promise.all([pendingA, pendingB, pendingC]), [false, false, true]);
  assert.deepEqual(h.state.applied.map(item => item.data.marker), ['final-c']);
}

// 6. Only a current-index failure may update the error presentation.
{
  const current = makeHarness();
  current.context.loadHistoricalData = async () => { throw new Error('current failure'); };
  assert.equal(await current.context.fillHistoricalDate(), false);
  assert.equal(current.state.messages.filter(message => message.includes('回填失败')).length, 1);
  assert.equal(current.state.errors.length, 1);

  const stale = makeHarness();
  const item = deferred();
  stale.context.loadHistoricalData = () => item.promise;
  const pending = stale.context.fillHistoricalDate();
  switchIndex(stale, '930955');
  item.reject(new Error('stale failure'));
  assert.equal(await pending, false);
  assert.equal(stale.state.messages.filter(message => message.includes('回填失败')).length, 0);
  assert.equal(stale.state.errors.length, 0);
}

// 7. Historical loading never changes the Pine Manual Override state.
{
  const h = makeHarness();
  h.context.loadHistoricalData = async () => ({index: '000922', marker: 'override'});
  assert.equal(await h.context.fillHistoricalDate(), true);
  assert.deepEqual(h.state.override, {enabled: true, score: 8});
  assert.equal(h.state.applied.length, 1);
}

console.log('V1.3 historical identity: normal, switch, both late directions, rapid race, failure ownership, no-Abort fallback and Manual Override PASS');
