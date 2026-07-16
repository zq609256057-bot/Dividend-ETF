import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const adapter = fs.readFileSync(new URL('../public/history_backfill_candidate_adapter.js', import.meta.url), 'utf8');
const guardStart = html.indexOf('function captureIndexRequestIdentity');
const guardEnd = html.indexOf('function selectIndex', guardStart);
assert.ok(guardStart >= 0 && guardEnd > guardStart);
const guardSource = html.slice(guardStart, guardEnd);

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return {promise, resolve, reject};
}

function payload(code = '000922') {
  return {
    code, name: code, date: '2026-07-14', source: 'historical_calculation', notLatest: true, notArchive: true,
    valuation: {status: 'available', date: '2026-07-14', dividendYield: 0.04421, didPercentileFullHistory: 55, pb: 0.88, pbPercentileFullHistory: 4, peTtm: 10, peTtmPercentileFullHistory: 29, roeImpliedTtm: 0.088},
    macro: {status: 'available', cn10y: 1.74, yieldSpread: 2.68, yieldSpreadPercentile: 62, window: '10Y', sampleCount: 2400, valuationDate: '2026-07-14', macroDate: '2026-07-14'},
    technical: {status: 'available', date: '2026-07-14', close: 5307.5, sma60: 5541, sma120: 5634, sma250: 5599, rsi14: 49, volumeRatio5d: 1.2, volumeStatus: 'up_big', pricePosition252: 30, price252Low: 5022, price252High: 5977, priceMaHistory: []},
    pine: {status: 'available', score: 3, engineVersion: 'pine-v7-red-rocket-final'},
  };
}

function harness() {
  const requests = [];
  const elements = {
    'backfill-date-div': {value: '2026-07-14'},
    'backfill-button-div': {textContent: '⏮ 回填该日', disabled: false},
    'header-date': {value: 'UNCHANGED'},
    'pine-manual-override-enabled': {checked: false},
    'pine-auto-score': {textContent: ''}, 'pine-auto-source': {textContent: ''},
    'pine-auto-date': {textContent: ''}, 'pine-auto-engine': {textContent: ''},
    'pine-auto-mode': {textContent: ''}, 'pine-auto-status': {textContent: ''},
  };
  const state = {applied: [], messages: [], errors: [], cleared: 0};
  const context = vm.createContext({
    indexActivationId: 1, indexActivationController: new AbortController(), _selIndex: '000922',
    AbortController, URLSearchParams, encodeURIComponent, Object, String, Promise,
    location: {search: '', origin: 'https://candidate.test'}, DATA_API_DIV: 'https://candidate.test',
    getIndexConfig: code => ({code, apiCode: code, name: code}),
    g: id => elements[id] || null,
    document: {getElementById: id => elements[id] || null},
    fetch: (url, options) => {
      const pending = deferred();
      requests.push({url, options, pending});
      return pending.promise;
    },
    clearHistoricalAutoFields: () => { state.cleared += 1; },
    applyDivData: (data, options) => {
      if (!context.isCurrentIndexRequest(options.requestIdentity)) return false;
      state.applied.push(data); return true;
    },
    showMsg: message => state.messages.push(message),
    maTrendHistory: () => [],
    resolvePineScore: () => elements['pine-manual-override-enabled'].checked
      ? {score: 8, source: 'Manual Override', mode: 'override', date: '2026-07-14', engineVersion: null}
      : {score: 1, source: 'Manual Input', mode: 'manual', date: '2026-07-14', engineVersion: null},
    console: {error: (...args) => state.errors.push(args), warn: () => {}},
  });
  context.globalThis = context;
  vm.runInContext(`${guardSource}\n${adapter}`, context);
  return {context, requests, elements, state};
}

function switchIndex(harness, code) {
  const {context} = harness;
  if (context.indexActivationController) context.indexActivationController.abort();
  context.indexActivationId += 1;
  context._selIndex = code;
  context.indexActivationController = new AbortController();
}

// Case 1: a normal 000922 request commits and always restores the canonical button state.
{
  const h = harness();
  assert.equal(h.elements['backfill-button-div'].textContent, '查询历史');
  const promise = h.context.fillHistoricalDate();
  assert.equal(h.elements['backfill-button-div'].textContent, '⏳ 计算中...');
  assert.equal(h.elements['backfill-button-div'].disabled, true);
  h.requests[0].pending.resolve({ok: true, status: 200, json: async () => payload()});
  assert.equal(await promise, true);
  assert.equal(h.state.applied.length, 1);
  assert.equal(h.context.DividendHistoryCandidate.current.code, '000922');
  assert.equal(h.elements['pine-auto-score'].textContent, '3.0');
  assert.equal(h.elements['backfill-button-div'].textContent, '查询历史');
  assert.equal(h.elements['backfill-button-div'].disabled, false);
}

// Case 2: rapid 000922 -> 930955 -> 000922 commits only the final request and restores the button.
{
  const h = harness();
  const first = h.context.fillHistoricalDate();
  switchIndex(h, '930955');
  const second = h.context.fillHistoricalDate();
  switchIndex(h, '000922');
  const third = h.context.fillHistoricalDate();
  h.requests[2].pending.resolve({ok: true, status: 200, json: async () => payload('000922')});
  assert.equal(await third, true);
  h.requests[0].pending.resolve({ok: true, status: 200, json: async () => payload('000922')});
  h.requests[1].pending.resolve({ok: true, status: 200, json: async () => payload('930955')});
  assert.deepEqual(await Promise.all([first, second]), [false, false]);
  assert.deepEqual(h.state.applied.map(item => item.index), ['000922']);
  assert.equal(h.context.DividendHistoryCandidate.current.code, '000922');
  assert.equal(h.elements['backfill-button-div'].textContent, '查询历史');
  assert.equal(h.elements['backfill-button-div'].disabled, false);
}

// Case 3: a late old response cannot overwrite the new index or touch its completed button state.
{
  const h = harness();
  const oldRequest = h.context.fillHistoricalDate();
  switchIndex(h, '930955');
  const currentRequest = h.context.fillHistoricalDate();
  h.requests[1].pending.resolve({ok: true, status: 200, json: async () => payload('930955')});
  assert.equal(await currentRequest, true);
  assert.equal(h.elements['backfill-button-div'].textContent, '查询历史');
  h.requests[0].pending.resolve({ok: true, status: 200, json: async () => payload('000922')});
  assert.equal(await oldRequest, false);
  assert.deepEqual(h.state.applied.map(item => item.index), ['930955']);
  assert.equal(h.context.DividendHistoryCandidate.current.code, '930955');
  assert.equal(h.elements['backfill-button-div'].textContent, '查询历史');
  assert.equal(h.elements['backfill-button-div'].disabled, false);
}

// Case 4: an HTTP error restores the canonical button label and enabled state.
{
  const h = harness();
  const promise = h.context.fillHistoricalDate();
  h.requests[0].pending.resolve({ok: false, status: 500, json: async () => ({error: 'API_FAILED', detail: 'test failure'})});
  assert.equal(await promise, false);
  assert.equal(h.state.applied.length, 0);
  assert.equal(h.state.messages.filter(message => message.includes('回填失败')).length, 1);
  assert.equal(h.elements['backfill-button-div'].textContent, '查询历史');
  assert.equal(h.elements['backfill-button-div'].disabled, false);
}

// Identity mismatch still fails closed and Manual Override remains above historical Python Auto.
{
  const mismatch = harness();
  const mismatchPromise = mismatch.context.fillHistoricalDate();
  mismatch.requests[0].pending.resolve({ok: true, status: 200, json: async () => payload('930955')});
  assert.equal(await mismatchPromise, false);
  assert.equal(mismatch.state.applied.length, 0);
  assert.equal(mismatch.context.DividendHistoryCandidate.current, null);

  const h = harness();
  const promise = h.context.fillHistoricalDate();
  h.requests[0].pending.resolve({ok: true, status: 200, json: async () => payload()});
  assert.equal(await promise, true);
  h.elements['pine-manual-override-enabled'].checked = true;
  assert.deepEqual(h.context.resolvePineScore(), {score: 8, source: 'Manual Override', mode: 'override', date: '2026-07-14', engineVersion: null});
}

assert.match(adapter, /signal:requestIdentity\.signal/);
assert.match(adapter, /payload\.code!==requestCode/);
assert.match(adapter, /if\(!isCurrent\(requestIdentity\)\)return false;/);
assert.match(adapter, /requestIdentity:requestIdentity/);
assert.match(adapter, /historyRequestId/);
assert.match(adapter, /requestId===currentRequestId&&isCurrent\(identity\)/);
assert.match(adapter, /DEFAULT_LABEL='查询历史'/);
assert.match(adapter, /LOADING_LABEL='⏳ 计算中\.\.\.'/);
assert.doesNotMatch(adapter, /original=button|button\?button\.textContent/);
assert.doesNotMatch(adapter, /DIVIDEND_SNAPSHOTS|admin\/snapshot|\.put\(/);

console.log('V1.3 Candidate history adapter: normal restore, rapid switch, late discard, HTTP failure restore, identity mismatch and Manual Override precedence PASS');
