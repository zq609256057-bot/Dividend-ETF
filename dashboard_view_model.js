export const CONTRACT_INCOMPLETE = 'DASHBOARD_CONTRACT_INCOMPLETE';
export const IDENTITY_MISMATCH = 'DASHBOARD_IDENTITY_MISMATCH';

const HEX64 = /^[0-9a-f]{64}$/;
const ROOT_FIELDS = [
  'schema_version', 'mode', 'index_code', 'trade_date', 'source_identity',
  'verified_status', 'data_authority', 'identity', 'score', 'market',
  'valuation_components', 'technical_components', 'trend', 'cards', 'history',
];
const IDENTITY_FIELDS = [
  'projection_version', 'manifest_digest', 'result_digest', 'snapshot_digest',
  'dashboard_snapshot_digest', 'component_result_digest', 'authority_digest',
  'dashboard_payload_digest', 'rule_version', 'engine_version',
];
const SCORE_FIELDS = [
  'total_score', 'valuation_score', 'technical_score', 'trend_adjustment',
];
const FACT_FIELDS = [
  'value', 'trade_date', 'source_identity', 'evidence_digest',
  'estimated', 'fallback_used',
];
const COMPONENT_FIELDS = [
  'component_id', 'score', 'max_score', 'input_value', 'input_unit',
  'reason_code', 'source_factor_path', 'evidence_digest',
];
const VALUATION_IDS = ['did', 'yield_spread', 'cn10y', 'pb_percentile', 'roe'];
const TECHNICAL_IDS = ['price_ma', 'price_position_252', 'pine', 'rsi', 'volume'];
const CARD_IDS = [
  'price_ma', 'price_position_252', 'valuation_dashboard',
  'momentum', 'market_environment', 'comprehensive_judgment',
];

export class DashboardContractError extends Error {
  constructor(code, detail = '') {
    super(detail || code);
    this.name = 'DashboardContractError';
    this.code = code;
  }
}

function fail(code, detail) {
  throw new DashboardContractError(code, detail);
}

function requireObject(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(CONTRACT_INCOMPLETE, `${label} absent`);
  }
  const missing = fields.filter(field => !(field in value));
  if (missing.length) fail(CONTRACT_INCOMPLETE, `${label} missing ${missing.join(',')}`);
}

function validateComponents(items, expectedIds, label) {
  if (!Array.isArray(items) || items.length !== expectedIds.length) {
    fail(CONTRACT_INCOMPLETE, `${label} count`);
  }
  const ids = items.map(item => item?.component_id);
  if (new Set(ids).size !== expectedIds.length || expectedIds.some(id => !ids.includes(id))) {
    fail(CONTRACT_INCOMPLETE, `${label} ids`);
  }
  for (const item of items) {
    requireObject(item, COMPONENT_FIELDS, `${label}.${item?.component_id || '?'}`);
    if (!HEX64.test(item.evidence_digest)) fail(CONTRACT_INCOMPLETE, `${label} evidence`);
    if (
      !Number.isFinite(item.score)
      || !Number.isFinite(item.max_score)
      || item.score < 0
      || item.score > item.max_score
    ) fail(CONTRACT_INCOMPLETE, `${label} range`);
  }
}

function cloneAndFreeze(value) {
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

export function adaptDashboardResponse(response, expected) {
  const viewModel = response?.dashboard;
  requireObject(viewModel, ROOT_FIELDS, 'dashboard');
  if (viewModel.schema_version !== 'dashboard_view_model_v1') {
    fail(CONTRACT_INCOMPLETE, 'schema_version');
  }
  const expectedMode = expected.trade_date === 'latest'
    ? 'LIVE_CANONICAL'
    : 'HISTORICAL_REPLAY';
  if (
    viewModel.mode !== expectedMode
    || viewModel.index_code !== expected.index_code
    || (expected.trade_date !== 'latest' && viewModel.trade_date !== expected.trade_date)
    || viewModel.verified_status !== 'POINT_IN_TIME_VERIFIED'
    || viewModel.data_authority !== 'POINT_IN_TIME_VERIFIED'
  ) fail(IDENTITY_MISMATCH, 'root identity');

  requireObject(viewModel.identity, IDENTITY_FIELDS, 'identity');
  for (const field of IDENTITY_FIELDS.filter(field => field.endsWith('_digest'))) {
    if (!HEX64.test(viewModel.identity[field])) fail(CONTRACT_INCOMPLETE, `identity.${field}`);
  }
  if (typeof viewModel.source_identity !== 'string' || !viewModel.source_identity) {
    fail(CONTRACT_INCOMPLETE, 'source_identity');
  }
  requireObject(viewModel.score, SCORE_FIELDS, 'score');
  if (SCORE_FIELDS.some(field => !Number.isFinite(viewModel.score[field]))) {
    fail(CONTRACT_INCOMPLETE, 'score values');
  }

  validateComponents(viewModel.valuation_components, VALUATION_IDS, 'valuation_components');
  validateComponents(viewModel.technical_components, TECHNICAL_IDS, 'technical_components');
  const valuation = viewModel.valuation_components.reduce((sum, item) => sum + item.score, 0);
  const technical = viewModel.technical_components.reduce((sum, item) => sum + item.score, 0);
  const total = valuation + technical + viewModel.score.trend_adjustment;
  if (
    Math.abs(valuation - viewModel.score.valuation_score) > 1e-9
    || Math.abs(technical - viewModel.score.technical_score) > 1e-9
    || Math.abs(total - viewModel.score.total_score) > 1e-9
  ) fail(IDENTITY_MISMATCH, 'score arithmetic');

  requireObject(viewModel.market, ['index_point', 'did', 'cn10y', 'yield_spread'], 'market');
  for (const [name, fact] of Object.entries(viewModel.market)) {
    requireObject(fact, FACT_FIELDS, `market.${name}`);
    if (
      fact.trade_date !== viewModel.trade_date
      || !HEX64.test(fact.evidence_digest)
      || fact.fallback_used !== false
    ) fail(IDENTITY_MISMATCH, `market.${name}`);
  }
  requireObject(viewModel.cards, CARD_IDS, 'cards');
  if (!Array.isArray(viewModel.history)) fail(CONTRACT_INCOMPLETE, 'history');
  for (const record of viewModel.history) {
    if (
      record.index_code !== viewModel.index_code
      || record.trade_date !== viewModel.trade_date
      || record.verified_status !== 'POINT_IN_TIME_VERIFIED'
    ) fail(IDENTITY_MISMATCH, 'history identity');
  }
  return cloneAndFreeze(viewModel);
}
