const DASHBOARD_ROUTE = '/api/v1/canonical/dashboard';
const HISTORICAL_DASHBOARD_ROUTE = '/api/v1/historical/dashboard';
const HEX64 = /^[0-9a-f]{64}$/;
const HISTORICAL_COMPONENT_KEYS = new Set([
  'did', 'pb_percentile', 'roe', 'yield_spread', 'cn10y',
  'price_ma', 'price_position_252', 'rsi14', 'volume', 'pine',
]);

export class DashboardApiError extends Error {
  constructor(code, status = 0, detail = '') {
    super(detail || code);
    this.name = 'DashboardApiError';
    this.code = code;
    this.status = status;
  }
}

export async function fetchDashboard({
  index_code,
  trade_date = 'latest',
  signal,
  fetchImpl = globalThis.fetch,
  baseUrl = '',
}) {
  const query = new URLSearchParams({index_code, trade_date});
  let response;
  try {
    response = await fetchImpl(`${baseUrl}${DASHBOARD_ROUTE}?${query}`, {
      method: 'GET',
      headers: {Accept: 'application/json'},
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new DashboardApiError('CANONICAL_DASHBOARD_UNAVAILABLE', 0);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new DashboardApiError('DASHBOARD_CONTRACT_INCOMPLETE', response.status);
  }

  if (!response.ok) {
    throw new DashboardApiError(
      payload?.error || 'CANONICAL_DASHBOARD_UNAVAILABLE',
      response.status,
    );
  }
  if (
    payload?.status !== 'complete'
    || payload?.contract_version !== 'canonical_dashboard_read_v1'
    || payload?.verified_only !== true
    || !payload?.dashboard
  ) {
    throw new DashboardApiError('DASHBOARD_CONTRACT_INCOMPLETE', response.status);
  }
  return payload;
}

export async function fetchHistoricalDashboard({
  index_code,
  trade_date,
  view_mode = 'v2_unified',
  signal,
  fetchImpl = globalThis.fetch,
  baseUrl = '',
}) {
  if (trade_date !== 'latest' && !/^\d{4}-\d{2}-\d{2}$/.test(trade_date || '')) {
    throw new DashboardApiError('HISTORICAL_DASHBOARD_UNAVAILABLE', 404);
  }
  const query = new URLSearchParams({index_code, trade_date, view_mode});
  let response;
  try {
    response = await fetchImpl(`${baseUrl}${HISTORICAL_DASHBOARD_ROUTE}?${query}`, {
      method: 'GET',
      headers: {Accept: 'application/json'},
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new DashboardApiError('HISTORICAL_DASHBOARD_ARCHIVE_UNAVAILABLE', 503);
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new DashboardApiError('HISTORICAL_DASHBOARD_INCOMPLETE', response.status || 422);
  }
  if (!response.ok) {
    throw new DashboardApiError(
      payload?.error || 'HISTORICAL_DASHBOARD_UNAVAILABLE',
      response.status,
      payload?.detail,
    );
  }
  if (
    payload?.status !== 'complete'
    || ![
      'historical_dashboard_local_candidate_v1',
      'historical_dashboard_archive_v2',
    ].includes(payload?.contract_version)
    || !payload?.dashboard
  ) {
    throw new DashboardApiError('HISTORICAL_DASHBOARD_INCOMPLETE', 422);
  }
  return payload;
}

function failHistorical(code, status, detail = '') {
  throw new DashboardApiError(code, status, detail);
}

function immutableClone(value) {
  const clone = typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
  const freeze = current => {
    if (current && typeof current === 'object' && !Object.isFrozen(current)) {
      Object.freeze(current);
      Object.values(current).forEach(freeze);
    }
    return current;
  };
  return freeze(clone);
}

export function adaptHistoricalDashboardResponse(payload, expected) {
  const isSynthetic = payload?.contract_version === 'historical_dashboard_local_candidate_v1';
  const isArchive = payload?.contract_version === 'historical_dashboard_archive_v2';
  if (
    !payload
    || payload.status !== 'complete'
    || (!isSynthetic && !isArchive)
    || payload.index_code !== expected.index_code
    || (expected.trade_date !== 'latest' && payload.trade_date !== expected.trade_date)
    || !['HISTORICAL_REPLAY', 'HISTORICAL_CALCULATION'].includes(payload.mode)
    || (isArchive && payload.view_mode !== expected.view_mode)
  ) {
    failHistorical('HISTORICAL_DASHBOARD_IDENTITY_MISMATCH', 409);
  }
  if (isSynthetic && (
    payload.fixture_label !== 'Synthetic Test Fixture'
    || payload.data_identity !== 'LOCAL_CANDIDATE_SYNTHETIC_FIXTURE'
    || !payload.version_tuple
  )) {
    failHistorical('HISTORICAL_DASHBOARD_INCOMPLETE', 422);
  }
  if (
    isArchive
    && (
      !['v2_unified', 'original_replay', 'v1_comparison'].includes(payload.view_mode)
      || !payload.version_tuple
      || payload.dashboard?.view_mode !== payload.view_mode
      || payload.dashboard?.timeframe_identity !== '1D'
      || !payload.dashboard?.pine_rule_version
      || !payload.dashboard?.score_profile_version
    )
  ) {
    failHistorical('HISTORICAL_DASHBOARD_IDENTITY_MISMATCH', 409);
  }
  if (
    payload.mode === 'HISTORICAL_CALCULATION'
    && (
      payload.point_in_time_verified !== false
      || payload.display_label !== '历史计算 · 非当时点验证'
      || !payload.calculation_disclaimer
    )
  ) {
    failHistorical('HISTORICAL_DASHBOARD_IDENTITY_MISMATCH', 409);
  }
  if (
    payload.mode === 'HISTORICAL_REPLAY'
    && (
      payload.point_in_time_verified !== true
      || payload.display_label !== '历史回放 · 当时点已验证'
    )
  ) {
    failHistorical('HISTORICAL_DASHBOARD_IDENTITY_MISMATCH', 409);
  }
  const digestFields = [
    'version_tuple_digest', 'input_snapshot_digest',
    'calculation_summary_digest', 'result_revision_digest',
    'dashboard_payload_digest',
  ];
  if (digestFields.some(field => !HEX64.test(payload[field] || ''))) {
    failHistorical('HISTORICAL_DASHBOARD_INCOMPLETE', 422);
  }
  if (!Array.isArray(payload.components) || payload.components.length !== 10) {
    failHistorical('HISTORICAL_DASHBOARD_INCOMPLETE', 422);
  }
  const keys = payload.components.map(component => component?.component_key);
  if (
    new Set(keys).size !== 10
    || [...HISTORICAL_COMPONENT_KEYS].some(key => !keys.includes(key))
  ) {
    failHistorical('HISTORICAL_DASHBOARD_INCOMPLETE', 422);
  }
  let valuation = 0;
  let technical = 0;
  for (const component of payload.components) {
    if (
      !Number.isFinite(component.score)
      || !Number.isFinite(component.maximum_score)
      || component.score < 0
      || component.score > component.maximum_score
      || !['valuation', 'technical'].includes(component.dimension)
    ) {
      failHistorical('HISTORICAL_DASHBOARD_INCOMPLETE', 422);
    }
    if (component.dimension === 'valuation') valuation += component.score;
    else technical += component.score;
  }
  const final = Math.min(100, Math.max(0, valuation + technical + payload.trend_score));
  if (
    Math.abs(valuation - payload.valuation_score) > 1e-9
    || Math.abs(technical - payload.technical_score) > 1e-9
    || Math.abs(final - payload.final_score) > 1e-9
  ) {
    failHistorical('HISTORICAL_DASHBOARD_INCOMPLETE', 422);
  }
  const dashboard = payload.dashboard;
  if (
    dashboard.index_code !== payload.index_code
    || dashboard.trade_date !== payload.trade_date
    || dashboard.mode !== payload.mode
    || dashboard.identity?.version_tuple_digest !== payload.version_tuple_digest
    || dashboard.identity?.input_snapshot_digest !== payload.input_snapshot_digest
    || dashboard.identity?.calculation_summary_digest !== payload.calculation_summary_digest
    || dashboard.identity?.result_revision_digest !== payload.result_revision_digest
    || dashboard.identity?.dashboard_payload_digest !== payload.dashboard_payload_digest
    || dashboard.valuation_components?.length !== 5
    || dashboard.technical_components?.length !== 5
  ) {
    failHistorical('HISTORICAL_DASHBOARD_IDENTITY_MISMATCH', 409);
  }
  return immutableClone(dashboard);
}

export {
  DASHBOARD_ROUTE,
  HISTORICAL_DASHBOARD_ROUTE,
};
