import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import worker from '../worker.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workspace = path.resolve(repo, '..');
const snapshot = JSON.parse(fs.readFileSync(path.join(workspace, 'local_data_collector/output/dividend_indices_latest.json'), 'utf8'));
const port = Number(process.argv[2] || 8789);
const apiPaths = new Set(['/indices', '/latest', '/health', '/history/calculate']);
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8'};

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  if (apiPaths.has(url.pathname)) {
    const result = await worker.fetch(new Request(url, {method: request.method}), {DIVIDEND_SNAPSHOT: snapshot});
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
    return;
  }
  const relative = url.pathname === '/' ? 'v1_3_shadow/index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const target = path.resolve(repo, relative);
  if (!target.startsWith(repo + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    response.writeHead(404); response.end('Not found'); return;
  }
  response.writeHead(200, {'Content-Type': mime[path.extname(target)] || 'application/octet-stream'});
  fs.createReadStream(target).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`V1.3 local shadow: http://127.0.0.1:${port}/v1_3_shadow/index.html?snapshot_api=http://127.0.0.1:${port}`);
});
