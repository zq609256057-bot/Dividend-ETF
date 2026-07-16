/** Dividend Dashboard V1.3 isolated Shadow Worker. Never deploy over the V1.2 Worker. */
import REGISTRY_CONFIG from './index_registry.json' with {type: 'json'};
import STATIC_SNAPSHOT from './output/dividend_indices_latest.shadow.json' with {type: 'json'};
import STATIC_PINE_SNAPSHOT from './output/pine_shadow_latest.canonical.json' with {type: 'json'};

const DEFAULT_INDEX_CODE = REGISTRY_CONFIG.defaultCode;
const INDEX_REGISTRY = REGISTRY_CONFIG.indices;
const REGISTRY_SCHEMA_VERSION = REGISTRY_CONFIG.schemaVersion;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(status, payload) {
  return new Response(JSON.stringify(payload), {status, headers: {...CORS, 'Cache-Control': 'no-store'}});
}

function parseValue(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}

function registry(env) {
  const value = parseValue(env?.INDEX_REGISTRY_JSON, {indices: INDEX_REGISTRY});
  const items = Array.isArray(value) ? value : value.indices;
  if (!Array.isArray(items)) throw new Error('INDEX_REGISTRY_JSON must contain indices');
  return items;
}

function enabledRegistry(env) {
  return registry(env).filter(item => item?.enabled === true);
}

function ready(item, key) {
  return item?.dataStatus?.[key] === 'ready';
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

async function snapshot(env) {
  const direct = parseValue(env?.DIVIDEND_SNAPSHOT, null);
  return direct || STATIC_SNAPSHOT;
}

function snapshotCodes(value) {
  return new Set(Array.isArray(value?.indices) ? value.indices.map(item => item?.code) : []);
}

async function indicesResponse(env) {
  const latest = await snapshot(env);
  const codes = snapshotCodes(latest);
  return {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    defaultCode: enabledRegistry(env).some(item => item.code === DEFAULT_INDEX_CODE)
      ? DEFAULT_INDEX_CODE
      : enabledRegistry(env)[0]?.code || null,
    indices: enabledRegistry(env).map(item => ({
      code: item.code,
      name: item.name,
      apiCode: item.apiCode,
      market: item.market,
      category: item.category,
      description: item.description || '',
      historyAvailable: ready(item, 'history'),
      latestAvailable: ready(item, 'latest') && codes.has(item.apiCode),
    })),
  };
}

async function latestResponse(env) {
  const value = await snapshot(env);
  if (!value || !Array.isArray(value.indices)) return json(503, {error: 'SNAPSHOT_UNAVAILABLE'});
  const items = enabledRegistry(env);
  const enabledApiCodes = new Set(items.map(item => item.apiCode));
  const filtered = value.indices.filter(item => enabledApiCodes.has(item?.code));
  const missing = items.filter(item => ready(item, 'latest') && !filtered.some(row => row.code === item.apiCode));
  if (missing.length) return json(503, {error: 'LATEST_INCOMPLETE', missing: missing.map(item => item.code)});
  return json(200, {...value, indices: filtered});
}

async function calculateHistory(request, env) {
  const url = new URL(request.url);
  const code = (url.searchParams.get('code') || '').toUpperCase();
  const targetDate = url.searchParams.get('date') || '';
  const item = enabledRegistry(env).find(candidate => candidate.code === code || candidate.apiCode === code);
  if (!item) return json(400, {error: 'UNSUPPORTED_CODE', detail: `index is not enabled: ${code}`, code, date: targetDate});
  if (!ready(item, 'history')) return json(422, {error: 'INSUFFICIENT_HISTORY', detail: `${item.code} has not passed the 250-day history gate`, code: item.code, date: targetDate});
  if (!validDate(targetDate)) return json(400, {error: 'INVALID_DATE', detail: 'date must use YYYY-MM-DD', code: item.code, date: targetDate});
  const day = new Date(`${targetDate}T00:00:00Z`).getUTCDay();
  if (day === 0 || day === 6) return json(422, {error: 'DATE_UNAVAILABLE', detail: `${targetDate} is a weekend`, code: item.code, date: targetDate});

  if (!env?.HISTORY_ENGINE?.fetch && !env?.HISTORY_ENGINE_URL) return json(503, {error: 'HISTORY_ENGINE_UNAVAILABLE'});
  const endpoint = new URL('/history/calculate', env.HISTORY_ENGINE_URL || 'https://history-engine.internal');
  endpoint.searchParams.set('code', item.apiCode);
  endpoint.searchParams.set('date', targetDate);
  endpoint.searchParams.set('v12', 'acceptance');
  let response;
  const historyFetch = env?.HISTORY_ENGINE?.fetch
    ? env.HISTORY_ENGINE.fetch.bind(env.HISTORY_ENGINE)
    : fetch;
  try { response = await historyFetch(new Request(endpoint, {method: 'GET', headers: {Accept: 'application/json'}})); }
  catch (error) { return json(502, {error: 'HISTORY_ENGINE_FAILED', detail: String(error?.message || error)}); }
  let payload;
  try { payload = await response.json(); }
  catch (_) { return json(502, {error: 'HISTORY_ENGINE_INVALID_RESPONSE', detail: `origin returned HTTP ${response.status}`}); }
  if (!response.ok) return json(response.status, payload);
  if (payload.source !== 'historical_calculation' || payload.code !== item.apiCode || payload.date !== targetDate) {
    return json(502, {error: 'HISTORY_ENGINE_CONTRACT_FAILED'});
  }
  return json(200, {...payload, code: item.code, name: item.name, cacheStatus: 'origin_read_only'});
}

function compactPineIndex(item) {
  const shadow = item.technical_shadow;
  return {
    code: item.code,
    name: item.name,
    date: shadow.date,
    pineV7: {
      score: shadow.pineV7.score,
      engineVersion: shadow.pineV7.engineVersion,
      calibrationStatus: shadow.pineV7.calibrationStatus,
    },
    andean: {state: shadow.andean?.state ?? null},
    impulseMacd: {state: shadow.impulseMacd?.state ?? null},
    squeeze: {state: shadow.squeeze?.state ?? null},
    riskLabel: {
      trendLifecycleState: shadow.riskLabel?.trendLifecycleState ?? null,
      trendRiskLevel: shadow.riskLabel?.trendRiskLevel ?? null,
      trendRiskReason: shadow.riskLabel?.trendRiskReason ?? null,
      trendLifecycleDays: shadow.riskLabel?.trendLifecycleDays ?? null,
      scoreEffect: shadow.riskLabel?.scoreEffect ?? null,
      tradeSemantics: shadow.riskLabel?.tradeSemantics ?? null,
    },
  };
}

function pineShadowResponse() {
  const indices = STATIC_PINE_SNAPSHOT.indices.map(compactPineIndex);
  return json(200, {
    ok: true,
    schemaVersion: 'pine_v7_shadow_v1',
    shadowOnly: true,
    generatedAt: STATIC_PINE_SNAPSHOT.generated_at,
    source: 'pine_shadow_snapshot',
    productionScoreEffect: 'none',
    tradeSemantics: 'none',
    indices,
    meta: {environment: 'v1_3_shadow', cacheStatus: 'bundled_read_only', kvWrites: 0},
  });
}

export default {
  async fetch(request, env = {}) {
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
    if (request.method !== 'GET') return json(405, {error: 'METHOD_NOT_ALLOWED'});
    const path = new URL(request.url).pathname;
    try {
      if (path === '/health') {
        const value = await snapshot(env);
        return json(200, {
          status: 'ok',
          service: 'dividend-index-management-shadow',
          production: false,
          kvWrites: 0,
          registrySchemaVersion: REGISTRY_SCHEMA_VERSION,
          as_of_date: value?.as_of_date || null,
        });
      }
      if (path === '/indices') return json(200, await indicesResponse(env));
      if (path === '/latest') return latestResponse(env);
      if (path === '/history/calculate') return calculateHistory(request, env);
      if (path === '/api/shadow/pine/latest') return pineShadowResponse();
      if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
      return json(404, {error: 'NOT_FOUND', routes: ['/health', '/indices', '/latest', '/history/calculate', '/api/shadow/pine/latest']});
    } catch (error) {
      return json(500, {error: 'REGISTRY_INVALID', detail: String(error?.message || error)});
    }
  },
};

export {calculateHistory, enabledRegistry, indicesResponse, latestResponse};
