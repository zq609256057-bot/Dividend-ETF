import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import worker from '../worker.mjs';

const candidate = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(fs.readFileSync(path.resolve(candidate, '../v1_3_shadow/output/dividend_indices_latest.shadow.json'), 'utf8'));
const pineSnapshot = JSON.parse(fs.readFileSync(path.resolve(candidate, 'pine_shadow_latest.canonical.json'), 'utf8'));
const port = Number(process.argv[2] || 8793);
const apiPaths = new Set(['/indices', '/latest', '/last-success', '/health', '/history/calculate', '/archive', '/dividend-data', '/api/shadow/pine/latest']);
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8'};
const history = new Map();
history.set(`dividend_indices_${snapshot.as_of_date}`, snapshot);
for (const code of ['000922', '930955']) {
  const item = snapshot.indices.find(candidate => candidate.code === code);
  const pineItem = pineSnapshot.indices.find(candidate => candidate.code === code);
  const valuation = item.valuation, macro = item.macro, technical = item.technical, pine = pineItem.technical_shadow.pineV7;
  history.set(`history_cache:${code}:2026-07-14`, {
    code, name: item.name, date: '2026-07-14', source: 'historical_calculation', notLatest: true, notArchive: true,
    valuation: {
      status: 'available', date: valuation.date, dividendYield: valuation.dividend_yield,
      didPercentileFullHistory: valuation.didPercentileFullHistory, pb: valuation.pb,
      pbPercentileFullHistory: valuation.pbPercentileFullHistory, peTtm: valuation.pe_ttm,
      peTtmPercentileFullHistory: valuation.peTtmPercentileFullHistory, roe: valuation.roe,
      roeImpliedTtm: valuation.roeImpliedTtm, estimated: valuation.estimated,
    },
    macro: {
      status: 'available', cn10y: macro.cn10yYield, yieldSpread: macro.yieldSpread,
      yieldSpreadPercentile: macro.yieldSpreadPercentile, window: macro.window,
      sampleCount: macro.sampleCount, valuationDate: macro.valuationDate, macroDate: macro.macroDate,
      source: macro.source, quality: macro.quality, estimated: macro.estimated,
    },
    technical: {
      status: 'available', date: technical.date, close: item.kline.close,
      sma60: technical.sma60, sma120: technical.sma120, sma250: technical.sma250,
      rsi14: technical.rsi14, volumeRatio5d: technical.volumeRatio5d, volumeStatus: technical.volumeStatus,
      pricePosition252: technical.pricePosition252, price252Low: technical.price252Low,
      price252High: technical.price252High, pricePosition252Estimated: technical.pricePosition252Estimated,
      source: technical.source, quality: technical.quality, priceMaHistory: [],
    },
    pine: {status: 'available', score: pine.score, engineVersion: pine.engineVersion},
    metadata: {},
  });
}
const env = {
  DEPLOYMENT_ENVIRONMENT: 'candidate',
  DIVIDEND_SNAPSHOT: snapshot,
  DIVIDEND_SNAPSHOTS: {
    get: async key => history.get(key) || (key === 'dividend_indices_last_success' ? snapshot : null),
  },
};

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  if (apiPaths.has(url.pathname)) {
    if (url.pathname === '/archive') await new Promise(resolve => setTimeout(resolve, 350));
    const result = await worker.fetch(new Request(url, {method: request.method}), env);
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
    return;
  }
  const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const target = path.resolve(candidate, 'public', relative);
  if (!target.startsWith(path.resolve(candidate, 'public') + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    response.writeHead(404); response.end('Not found'); return;
  }
  response.writeHead(200, {'Content-Type': mime[path.extname(target)] || 'application/octet-stream'});
  fs.createReadStream(target).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`V1.3 production candidate local: http://127.0.0.1:${port}/?snapshot_api=http://127.0.0.1:${port}`);
});
