/** Dividend Dashboard V1.3 production release candidate. Never deploy without the release gate. */
import REGISTRY_CONFIG from './index_registry.json' with {type: 'json'};
import STATIC_PINE_SNAPSHOT from './pine_shadow_latest.canonical.json' with {type: 'json'};

const REGISTRY_SCHEMA_VERSION = 'dividend_index_registry_v2';
const RELEASE_CODES = Object.freeze(['000922', '930955']);
const LATEST_KEY = 'dividend_indices_latest';
const LAST_SUCCESS_KEY = 'dividend_indices_last_success';
const HISTORY_INDEX_KEY = 'dividend_indices_history_dates';
const HISTORY_KEY_PREFIX = 'dividend_indices_snapshot:';
const HISTORY_CACHE_KEY_PREFIX = 'history_cache:';
const SNAPSHOT_SCHEMA_VERSION = 'dividend_indices_snapshot_v1';
const KV_PUT_WARNING_THRESHOLD = 800;
const KV_PUT_BLOCK_THRESHOLD = 950;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type, X-KV-Allow-Write, X-KV-Puts-Used-Today',
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

function registryConfig(env) {
  const value = parseValue(env?.INDEX_REGISTRY_JSON, REGISTRY_CONFIG);
  if (value?.schemaVersion !== REGISTRY_SCHEMA_VERSION || !Array.isArray(value?.indices)) {
    throw new Error('registry must use dividend_index_registry_v2');
  }
  return value;
}

function enabledRegistry(env) {
  const items = registryConfig(env).indices.filter(item => item?.enabled === true);
  const codes = items.map(item => item.code);
  if (JSON.stringify(codes) !== JSON.stringify(RELEASE_CODES)) {
    throw new Error(`production release registry must enable only ${RELEASE_CODES.join(',')}`);
  }
  for (const item of items) {
    if (!/^\d{6}$/.test(item.code) || !item.name || !item.apiCode || !item.market || !item.category) {
      throw new Error(`invalid enabled registry item: ${item?.code || '?'}`);
    }
  }
  return items;
}

function ready(item, key) {
  return item?.dataStatus?.[key] === 'ready';
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function loadSnapshot(env, key = LATEST_KEY) {
  if (key === LATEST_KEY && env?.DIVIDEND_SNAPSHOT) return parseValue(env.DIVIDEND_SNAPSHOT, null);
  if (!env?.DIVIDEND_SNAPSHOTS?.get) return null;
  return env.DIVIDEND_SNAPSHOTS.get(key, {type: 'json'});
}

function filterSnapshot(snapshot, env) {
  if (!snapshot || !Array.isArray(snapshot.indices)) return null;
  const enabled = enabledRegistry(env);
  const enabledApiCodes = new Set(enabled.map(item => item.apiCode));
  const indices = snapshot.indices.filter(item => enabledApiCodes.has(item?.code));
  const missing = enabled.filter(item => ready(item, 'latest') && !indices.some(row => row.code === item.apiCode));
  if (missing.length) throw new Error(`LATEST_INCOMPLETE:${missing.map(item => item.code).join(',')}`);
  return {...snapshot, indices};
}

async function indicesResponse(env) {
  const latest = filterSnapshot(await loadSnapshot(env), env);
  const available = new Set(latest?.indices?.map(item => item.code) || []);
  const enabled = enabledRegistry(env);
  const configuredDefault = registryConfig(env).defaultCode;
  return {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    defaultCode: enabled.some(item => item.code === configuredDefault) ? configuredDefault : enabled[0]?.code || null,
    indices: enabled.map(item => ({
      code: item.code,
      name: item.name,
      apiCode: item.apiCode,
      market: item.market,
      category: item.category,
      description: item.description || '',
      historyAvailable: ready(item, 'history'),
      latestAvailable: ready(item, 'latest') && available.has(item.apiCode),
    })),
  };
}

function validateSnapshot(snapshot, env) {
  const errors = [];
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return ['snapshot must be an object'];
  if (snapshot.schema_version !== SNAPSHOT_SCHEMA_VERSION) errors.push('invalid schema_version');
  if (snapshot.dashboard !== 'red_dividend') errors.push('invalid dashboard');
  if (snapshot.status !== 'success') errors.push('snapshot status must be success');
  if (snapshot.provider !== 'lixinger_cn_index') errors.push('invalid provider');
  if (!Array.isArray(snapshot.indices)) return [...errors, 'indices must be an array'];
  const expected = enabledRegistry(env).map(item => item.apiCode).sort();
  const actual = snapshot.indices.map(item => item?.code).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push('snapshot indices must exactly match enabled registry');
  for (const item of snapshot.indices) {
    if (!item?.kline || !item?.valuation || !item?.technical || !item?.macro) errors.push(`index ${item?.code || '?'} lacks required blocks`);
    if (item?.fallback_used !== false) errors.push(`index ${item?.code || '?'} uses fallback`);
    if (item?.technical?.source !== 'calculated_from_local_normal_kline') errors.push(`index ${item?.code || '?'} invalid technical source`);
    if (item?.valuation?.source !== 'lixinger_cn_index_fundamental') errors.push(`index ${item?.code || '?'} invalid valuation source`);
    if (item?.macro?.source !== 'lixinger_macro_national_debt') errors.push(`index ${item?.code || '?'} invalid macro source`);
  }
  return errors;
}

function toLegacyIndexResponse(snapshot, code) {
  const item = snapshot?.indices?.find(candidate => candidate.code === code);
  if (!item) return null;
  const kline = item.kline || {};
  const valuation = item.valuation || {};
  const technical = item.technical || {};
  const macro = item.macro || {};
  return {
    _status: 'ok',
    _mode: 'latest_snapshot',
    schema_version: snapshot.schema_version,
    as_of_date: snapshot.as_of_date,
    index: item.code,
    name: item.name,
    current_price: kline.close,
    price: kline.close,
    price_date: kline.date,
    did: valuation.dividend_yield,
    dividend_yield: valuation.dividend_yield,
    did_date: valuation.date,
    did_percentile_full_history: valuation.didPercentileFullHistory,
    pb: valuation.pb,
    pb_percentile_full_history: valuation.pbPercentileFullHistory,
    pe_ttm: valuation.pe_ttm,
    pe_ttm_percentile_full_history: valuation.peTtmPercentileFullHistory,
    roe: valuation.roe,
    roe_implied_ttm: valuation.roeImpliedTtm,
    cn10y: macro.cn10yYield ?? null,
    cn10y_date: macro.macroDate ?? null,
    yield_spread: macro.yieldSpread ?? null,
    yield_spread_percentile: macro.yieldSpreadPercentile ?? null,
    sma60: technical.sma60,
    sma120: technical.sma120,
    sma250: technical.sma250,
    rsi14: technical.rsi14,
    volume_ratio_5d: technical.volumeRatio5d,
    volume_status: technical.volumeStatus,
    price_position_252: technical.pricePosition252,
    price_252_low: technical.price252Low,
    price_252_high: technical.price252High,
    canonical: item,
  };
}

async function storeSnapshot(env, snapshot) {
  if (!env?.DIVIDEND_SNAPSHOTS?.get || !env?.DIVIDEND_SNAPSHOTS?.put) throw new Error('DIVIDEND_SNAPSHOTS binding missing');
  const serialized = JSON.stringify(canonicalize(snapshot));
  const targetSha256 = await sha256Hex(serialized);
  const current = await env.DIVIDEND_SNAPSHOTS.get(LATEST_KEY, {type: 'text'});
  if (current) {
    const currentCanonical = JSON.stringify(canonicalize(JSON.parse(current)));
    const currentSha256 = await sha256Hex(currentCanonical);
    if (currentSha256 === targetSha256) {
      return {status: 'SKIPPED_DUPLICATE_PAYLOAD', puts: 0, currentSha256, targetSha256};
    }
  }
  const existingDates = await env.DIVIDEND_SNAPSHOTS.get(HISTORY_INDEX_KEY, {type: 'json'}) || [];
  const historyDates = Array.from(new Set([...existingDates, snapshot.as_of_date])).sort();
  await Promise.all([
    env.DIVIDEND_SNAPSHOTS.put(LATEST_KEY, serialized),
    env.DIVIDEND_SNAPSHOTS.put(LAST_SUCCESS_KEY, serialized),
    env.DIVIDEND_SNAPSHOTS.put(HISTORY_KEY_PREFIX + snapshot.as_of_date, serialized),
    env.DIVIDEND_SNAPSHOTS.put(HISTORY_INDEX_KEY, JSON.stringify(historyDates)),
  ]);
  return {status: 'stored', puts: 4, currentSha256: null, targetSha256};
}

async function handleSnapshotUpload(request, env) {
  const configured = env?.SNAPSHOT_ADMIN_TOKEN;
  if (!configured || request.headers.get('Authorization') !== `Bearer ${configured}`) return json(401, {error: 'Unauthorized'});
  if (request.headers.get('X-KV-Allow-Write') !== 'true') return json(403, {error: 'KV_WRITE_AUTHORIZATION_REQUIRED'});
  const quotaHeader = request.headers.get('X-KV-Puts-Used-Today');
  if (quotaHeader == null || quotaHeader.trim() === '') return json(400, {error: 'kv_quota_usage_unknown'});
  const putsUsedToday = Number(quotaHeader);
  if (!Number.isInteger(putsUsedToday) || putsUsedToday < 0) return json(400, {error: 'kv_quota_usage_unknown'});
  const projectedPuts = putsUsedToday + 4;
  if (projectedPuts >= KV_PUT_BLOCK_THRESHOLD) return json(429, {error: 'KV_QUOTA_GUARD_BLOCKED', putsUsedToday, projectedPuts});
  let snapshot;
  try { snapshot = await request.json(); }
  catch (error) { return json(400, {error: 'Invalid JSON', detail: String(error?.message || error)}); }
  let errors;
  try { errors = validateSnapshot(snapshot, env); }
  catch (error) { return json(400, {error: 'REGISTRY_INVALID', detail: String(error?.message || error)}); }
  if (errors.length) return json(400, {error: 'Invalid Snapshot', errors});
  try {
    const result = await storeSnapshot(env, snapshot);
    return json(200, {
      status: result.status === 'stored' ? 'success' : result.status,
      schema_version: snapshot.schema_version,
      as_of_date: snapshot.as_of_date,
      codes: snapshot.indices.map(item => item.code),
      kv_guard: {
        puts: result.puts,
        projectedPuts,
        warning: projectedPuts >= KV_PUT_WARNING_THRESHOLD,
        currentSha256: result.currentSha256,
        targetSha256: result.targetSha256,
      },
      stored_latest: result.puts > 0,
      stored_last_success: result.puts > 0,
      stored_history_date: result.puts > 0,
    });
  } catch (error) {
    return json(503, {error: 'Snapshot Store Failed', detail: String(error?.message || error)});
  }
}

async function calculateHistory(request, env) {
  const url = new URL(request.url);
  const code = (url.searchParams.get('code') || '').toUpperCase();
  const targetDate = url.searchParams.get('date') || '';
  const item = enabledRegistry(env).find(candidate => candidate.code === code || candidate.apiCode === code);
  if (!item) return json(400, {error: 'UNSUPPORTED_CODE', code, date: targetDate});
  if (!ready(item, 'history')) return json(422, {error: 'INSUFFICIENT_HISTORY', code: item.code, date: targetDate});
  if (!validDate(targetDate)) return json(400, {error: 'INVALID_DATE', code: item.code, date: targetDate});
  const day = new Date(`${targetDate}T00:00:00Z`).getUTCDay();
  if (day === 0 || day === 6) return json(422, {error: 'DATE_UNAVAILABLE', code: item.code, date: targetDate});
  if (!env?.DIVIDEND_SNAPSHOTS?.get) return json(503, {error: 'HISTORY_ENGINE_UNAVAILABLE'});
  const payload = await env.DIVIDEND_SNAPSHOTS.get(`${HISTORY_CACHE_KEY_PREFIX}${item.apiCode}:${targetDate}`, {type: 'json'});
  if (!payload) return json(404, {error: 'DATE_NOT_FOUND', code: item.code, date: targetDate});
  if (payload.error) return json(Number(payload.httpStatus) || 422, payload);
  if (payload.code !== item.apiCode || payload.date !== targetDate || payload.source !== 'historical_calculation') {
    return json(502, {error: 'HISTORY_ENGINE_CONTRACT_FAILED'});
  }
  return json(200, {...payload, code: item.code, name: item.name, cacheStatus: 'kv_materialized_read_only'});
}

function pineResponse(env) {
  const enabled = new Set(enabledRegistry(env).map(item => item.apiCode));
  const indices = STATIC_PINE_SNAPSHOT.indices
    .filter(item => enabled.has(item.code))
    .map(item => ({
      code: item.code,
      name: item.name,
      date: item.technical_shadow.date,
      pineV7: item.technical_shadow.pineV7,
      andean: item.technical_shadow.andean,
      impulseMacd: item.technical_shadow.impulseMacd,
      squeeze: item.technical_shadow.squeeze,
      riskLabel: item.technical_shadow.riskLabel,
    }));
  return json(200, {
    ok: true,
    schemaVersion: 'pine_v7_shadow_v1',
    shadowOnly: true,
    generatedAt: STATIC_PINE_SNAPSHOT.generated_at,
    source: 'pine_shadow_snapshot',
    productionScoreEffect: 'none',
    tradeSemantics: 'none',
    indices,
    meta: {environment: 'v1_3_production_candidate', cacheStatus: 'bundled_read_only', kvWrites: 0},
  });
}

async function handleGet(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/indices') return json(200, await indicesResponse(env));
  if (url.pathname === '/latest') {
    const snapshot = filterSnapshot(await loadSnapshot(env), env);
    return snapshot ? json(200, snapshot) : json(503, {error: 'SNAPSHOT_UNAVAILABLE'});
  }
  if (url.pathname === '/last-success') {
    const snapshot = filterSnapshot(await loadSnapshot(env, LAST_SUCCESS_KEY), env);
    return snapshot ? json(200, snapshot) : json(503, {error: 'SNAPSHOT_UNAVAILABLE'});
  }
  if (url.pathname === '/history/calculate') return calculateHistory(request, env);
  if (url.pathname === '/archive') {
    const code = (url.searchParams.get('index') || registryConfig(env).defaultCode || RELEASE_CODES[0]).toUpperCase();
    const item = enabledRegistry(env).find(candidate => candidate.code === code || candidate.apiCode === code);
    if (!item) return json(400, {error: 'UNSUPPORTED_CODE', code});
    const targetDate = url.searchParams.get('date');
    if (!targetDate) {
      const dates = env?.DIVIDEND_SNAPSHOTS?.get
        ? await env.DIVIDEND_SNAPSHOTS.get(HISTORY_INDEX_KEY, {type: 'json'}) || []
        : [];
      return json(200, {count: dates.length, total: dates.length, index: item.code, data: dates.map(date => ({date}))});
    }
    if (!validDate(targetDate)) return json(400, {error: 'Historical Date Invalid', reason: 'data_unavailable', date: targetDate});
    const historical = filterSnapshot(await loadSnapshot(env, HISTORY_KEY_PREFIX + targetDate), env);
    if (!historical) return json(404, {error: 'Historical Snapshot Not Found', reason: 'data_not_found', date: targetDate, index: item.code});
    return json(200, {count: 1, total: 1, index: item.code, date: targetDate, data: [historical]});
  }
  if (url.pathname === '/dividend-data') {
    const code = (url.searchParams.get('index') || registryConfig(env).defaultCode || RELEASE_CODES[0]).toUpperCase();
    const item = enabledRegistry(env).find(candidate => candidate.code === code || candidate.apiCode === code);
    if (!item) return json(404, {error: 'Index Not Found', index: code});
    const targetDate = url.searchParams.get('date');
    const source = targetDate
      ? filterSnapshot(await loadSnapshot(env, HISTORY_KEY_PREFIX + targetDate), env)
      : filterSnapshot(await loadSnapshot(env), env);
    if (!source) return json(404, {error: 'Historical Snapshot Not Found', reason: 'data_not_found', date: targetDate});
    const adapted = toLegacyIndexResponse(source, item.apiCode);
    return adapted ? json(200, {...adapted, ...(targetDate ? {_mode: 'archived', _fetchedDate: targetDate} : {})}) : json(404, {error: 'Index Not Found', index: code});
  }
  if (url.pathname === '/api/shadow/pine/latest') return pineResponse(env);
  if (url.pathname === '/health') {
    const snapshot = filterSnapshot(await loadSnapshot(env), env);
    return json(200, {
      status: snapshot ? 'ok' : 'not_initialized',
      service: 'dividend-index-management-production-candidate',
      production: false,
      releaseCandidate: true,
      kvWrites: 0,
      registrySchemaVersion: REGISTRY_SCHEMA_VERSION,
      as_of_date: snapshot?.as_of_date || null,
    });
  }
  if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
  return json(404, {error: 'NOT_FOUND'});
}

export default {
  async fetch(request, env = {}) {
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
    try {
      const path = new URL(request.url).pathname;
      if (request.method === 'GET') return await handleGet(request, env);
      if (request.method === 'PUT' && path === '/admin/snapshot') return await handleSnapshotUpload(request, env);
      return json(405, {error: 'METHOD_NOT_ALLOWED'});
    } catch (error) {
      return json(500, {error: 'RELEASE_CANDIDATE_FAILED', detail: String(error?.message || error)});
    }
  },
};

export {enabledRegistry, handleSnapshotUpload, indicesResponse, validateSnapshot};
