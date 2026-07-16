import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import worker from '../worker.mjs';

const candidate = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(fs.readFileSync(path.resolve(candidate, '../v1_3_shadow/output/dividend_indices_latest.shadow.json'), 'utf8'));
const port = Number(process.argv[2] || 8793);
const apiPaths = new Set(['/indices', '/latest', '/last-success', '/health', '/history/calculate', '/api/shadow/pine/latest']);
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8'};
const history = new Map();
for (const code of ['000922', '930955']) history.set(`history_cache:${code}:2026-07-14`, {
  code, date: '2026-07-14', source: 'historical_calculation', notLatest: true, notArchive: true,
  valuation: {}, macro: {}, technical: {}, pine: {}, metadata: {},
});
const env = {
  DIVIDEND_SNAPSHOT: snapshot,
  DIVIDEND_SNAPSHOTS: {
    get: async key => history.get(key) || (key === 'dividend_indices_last_success' ? snapshot : null),
  },
};

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  if (apiPaths.has(url.pathname)) {
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
