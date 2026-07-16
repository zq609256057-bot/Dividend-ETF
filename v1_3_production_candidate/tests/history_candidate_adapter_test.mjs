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
  const pending = deferred();
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
    fetch: () => pending.promise,
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
  return {context, pending, elements, state};
}

// The deployed Candidate adapter commits a current response and installs historical Pine context.
{
  const h = harness();
  const promise = h.context.fillHistoricalDate();
  h.pending.resolve({ok: true, status: 200, json: async () => payload()});
  assert.equal(await promise, true);
  assert.equal(h.state.applied.length, 1);
  assert.equal(h.context.DividendHistoryCandidate.current.code, '000922');
  assert.equal(h.elements['pine-auto-score'].textContent, '3.0');
}

// A stale response cannot touch fields, errors, header date or Pine context.
{
  const h = harness();
  const promise = h.context.fillHistoricalDate();
  h.context.indexActivationController.abort();
  h.context.indexActivationController = new AbortController();
  h.context.indexActivationId = 2;
  h.context._selIndex = '930955';
  h.pending.resolve({ok: true, status: 200, json: async () => payload('000922')});
  assert.equal(await promise, false);
  assert.equal(h.state.applied.length, 0);
  assert.equal(h.context.DividendHistoryCandidate.current, null);
  assert.equal(h.elements['header-date'].value, 'UNCHANGED');
  assert.equal(h.state.errors.length, 0);
}

// A current response with the wrong code fails closed and does not commit.
{
  const h = harness();
  const promise = h.context.fillHistoricalDate();
  h.pending.resolve({ok: true, status: 200, json: async () => payload('930955')});
  assert.equal(await promise, false);
  assert.equal(h.state.applied.length, 0);
  assert.equal(h.context.DividendHistoryCandidate.current, null);
  assert.equal(h.state.messages.filter(message => message.includes('回填失败')).length, 1);
}

// Manual Override remains above historical Python Auto.
{
  const h = harness();
  const promise = h.context.fillHistoricalDate();
  h.pending.resolve({ok: true, status: 200, json: async () => payload()});
  assert.equal(await promise, true);
  h.elements['pine-manual-override-enabled'].checked = true;
  assert.deepEqual(h.context.resolvePineScore(), {score: 8, source: 'Manual Override', mode: 'override', date: '2026-07-14', engineVersion: null});
}

assert.match(adapter, /signal:requestIdentity\.signal/);
assert.match(adapter, /payload\.code!==requestCode/);
assert.match(adapter, /if\(!isCurrent\(requestIdentity\)\)return false;/);
assert.match(adapter, /requestIdentity:requestIdentity/);
assert.doesNotMatch(adapter, /DIVIDEND_SNAPSHOTS|admin\/snapshot|\.put\(/);

console.log('V1.3 Candidate history adapter: current commit, stale discard, identity mismatch and Manual Override precedence PASS');
