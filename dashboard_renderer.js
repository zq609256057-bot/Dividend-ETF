/* Pine V2 Dashboard renderer — identity-bound presentation V1.0. */

export const INDEX_DISPLAY_REGISTRY = Object.freeze({
  '000922': Object.freeze({name: '中证红利指数'}),
  '930955': Object.freeze({name: '红利低波指数'}),
});

export const SIGNAL_BAND_REGISTRY = Object.freeze([
  Object.freeze({
    min: 85, max: 100, range: '85–100', label: '强烈买入',
    operation: '估值与技术共振，加速上涨，加大布局', color: 'deep-green',
  }),
  Object.freeze({
    min: 70, max: 85, range: '70 ≤ 分数 < 85', label: '强买入',
    operation: '估值技术双优，积极布局分批入场', color: 'green',
  }),
  Object.freeze({
    min: 60, max: 70, range: '60 ≤ 分数 < 70', label: '中性偏多',
    operation: '轻仓试探，等待技术确认后加仓', color: 'light-green',
  }),
  Object.freeze({
    min: 45, max: 60, range: '45 ≤ 分数 < 60', label: '中性观望',
    operation: '持仓不动，耐心等待更好入场时机', color: 'yellow',
  }),
  Object.freeze({
    min: 30, max: 45, range: '30 ≤ 分数 < 45', label: '中性偏空',
    operation: '高估或技术偏弱，谨慎操作勿追高', color: 'orange',
  }),
  Object.freeze({
    min: 0, max: 30, range: '分数 < 30', label: '高估警示',
    operation: '估值与技术均偏弱，静待条件改善', color: 'red',
  }),
]);

const COMPONENT_NAMES = Object.freeze({
  did: 'DID 股息率',
  yield_spread: '股债利差',
  cn10y: 'CN10Y 国债收益率',
  pb_percentile: 'PB 历史百分位',
  roe: 'ROE',
  price_ma: '价格与均线',
  price_position_252: '252 日价格位置',
  pine: 'Pine 综合',
  rsi: 'RSI',
  volume: '成交量',
});

const VOLUME_STATES = Object.freeze({
  down_shrink: ['下跌缩量 · 健康洗盘', 'POSITIVE', 'green'],
  down_mild: ['下跌温和量', 'NEUTRAL', 'yellow'],
  down_vol: ['下跌放量 · 警惕', 'NEGATIVE', 'orange'],
  down_big: ['下跌巨量 · 风险', 'NEGATIVE', 'red'],
  flat: ['横盘 · 量能中性', 'NEUTRAL', 'yellow'],
  up_shrink: ['上涨缩量 · 惜售', 'POSITIVE', 'green'],
  up_mild: ['上涨温和量 · 健康', 'POSITIVE', 'green'],
  up_big: ['上涨放量 · 情绪偏热', 'NEGATIVE', 'orange'],
});

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[char],
  );
}

function fixed(value, digits = 1) {
  const parsed = number(value);
  return parsed == null ? '该口径暂无数据' : parsed.toFixed(digits);
}

function points(value) {
  const parsed = number(value);
  return parsed == null
    ? '数据不足，暂无法计算'
    : parsed.toLocaleString('zh-CN', {maximumFractionDigits: 2});
}

function percent(value, digits = 2) {
  const parsed = number(value);
  return parsed == null ? '该口径暂无数据' : `${parsed.toFixed(digits)}%`;
}

function componentById(vm, id) {
  return [...(vm.valuation_components || []), ...(vm.technical_components || [])]
    .find(component => component.component_id === id);
}

function inputNumber(component, keys = []) {
  const input = component?.input_value;
  if (number(input) != null) return number(input);
  for (const key of keys) {
    if (number(input?.[key]) != null) return number(input[key]);
  }
  return null;
}

function semantic(shortLabel, direction, color, reason, rawText) {
  return Object.freeze({
    short_label: shortLabel,
    direction,
    valuation_state: shortLabel,
    display_color: color,
    reason,
    raw_text: rawText,
  });
}

export const COMPONENT_SEMANTIC_REGISTRY = Object.freeze({
  did(component) {
    const value = inputNumber(component, ['did_percent']);
    const raw = value == null ? '原始值缺失' : `DID ${percent(value)}`;
    if (value == null) return semantic('数据不足', 'NEUTRAL', 'yellow', component?.reason_code, raw);
    if (value >= 5) return semantic('高股息 · 有利', 'POSITIVE', 'green', component.reason_code, raw);
    if (value >= 4.5) return semantic('股息率较高', 'POSITIVE', 'green', component.reason_code, raw);
    if (value >= 4) return semantic('股息率中性', 'NEUTRAL', 'yellow', component.reason_code, raw);
    return semantic('股息率偏低', 'NEGATIVE', 'orange', component.reason_code, raw);
  },
  yield_spread(component) {
    const value = inputNumber(component, ['yield_spread_percentage_points']);
    const pct = number(component?.input_value?.yield_spread_prefix_percentile);
    const raw = value == null
      ? '原始值缺失'
      : `利差 ${percent(value)}${pct == null ? '' : ` · 历史 ${percent(pct, 1)}`}`;
    if (value == null) return semantic('数据不足', 'NEUTRAL', 'yellow', component?.reason_code, raw);
    if (value >= 3) return semantic('利差较宽 · 有利', 'POSITIVE', 'green', component.reason_code, raw);
    if (value >= 2.5) return semantic('利差中性偏宽', 'POSITIVE', 'green', component.reason_code, raw);
    if (value >= 1.5) return semantic('利差中性', 'NEUTRAL', 'yellow', component.reason_code, raw);
    return semantic('利差偏窄 · 不利', 'NEGATIVE', 'red', component.reason_code, raw);
  },
  cn10y(component) {
    const value = inputNumber(component, ['value_percent']);
    const raw = value == null ? '原始值缺失' : `CN10Y ${percent(value, 4)}`;
    if (value == null) return semantic('数据不足', 'NEUTRAL', 'yellow', component?.reason_code, raw);
    if (value <= 1.8) return semantic('低利率 · 有利', 'POSITIVE', 'green', component.reason_code, raw);
    if (value <= 2.3) return semantic('利率中性', 'NEUTRAL', 'yellow', component.reason_code, raw);
    if (value <= 2.5) return semantic('利率偏高', 'NEGATIVE', 'orange', component.reason_code, raw);
    return semantic('高利率 · 不利', 'NEGATIVE', 'red', component.reason_code, raw);
  },
  pb_percentile(component) {
    const value = inputNumber(component, ['percentile']);
    const raw = value == null ? '原始值缺失' : `PB 历史百分位 ${percent(value, 1)}`;
    if (value == null) return semantic('数据不足', 'NEUTRAL', 'yellow', component?.reason_code, raw);
    if (value <= 20) return semantic('极低分位 · 低估', 'POSITIVE', 'green', component.reason_code, raw);
    if (value <= 35) return semantic('低分位 · 偏低估', 'POSITIVE', 'green', component.reason_code, raw);
    if (value <= 65) return semantic('中位 · 合理', 'NEUTRAL', 'yellow', component.reason_code, raw);
    if (value <= 80) return semantic('高分位 · 偏贵', 'NEGATIVE', 'orange', component.reason_code, raw);
    return semantic('极高分位 · 高估', 'NEGATIVE', 'red', component.reason_code, raw);
  },
  roe(component) {
    let value = inputNumber(component, ['roe_score_input']);
    if (number(component?.input_value?.roe_score_input) != null) value *= 100;
    const estimated = component?.input_value?.roe_input_identity?.includes('ESTIMATED');
    const raw = value == null
      ? '原始值缺失'
      : `${estimated ? '隐含 ' : ''}ROE ${percent(value, 2)}`;
    if (value == null) return semantic('数据不足', 'NEUTRAL', 'yellow', component?.reason_code, raw);
    if (value >= 12) return semantic('ROE 较高 · 有利', 'POSITIVE', 'green', component.reason_code, raw);
    if (value >= 8) return semantic('ROE 中性', 'NEUTRAL', 'yellow', component.reason_code, raw);
    if (value >= 6) return semantic('ROE 偏低', 'NEGATIVE', 'orange', component.reason_code, raw);
    return semantic('ROE 较低 · 不利', 'NEGATIVE', 'red', component.reason_code, raw);
  },
  price_ma(component) {
    const input = component?.input_value || {};
    const price = number(input.price ?? input.point);
    const sma60 = number(input.sma60);
    const sma250 = number(input.sma250);
    const raw = price == null ? '原始值缺失' : `点位 ${points(price)} · SMA60 ${points(sma60)} · SMA250 ${points(sma250)}`;
    if ([price, sma60, sma250].some(value => value == null)) {
      return semantic('均线数据不足', 'NEUTRAL', 'yellow', component?.reason_code, raw);
    }
    const longDeviation = (price - sma250) / sma250 * 100;
    if (price < Math.min(sma60, sma250)) {
      return semantic('低于主要均线 · 动能偏弱', 'NEGATIVE', 'orange', component.reason_code, raw);
    }
    if (price < Math.max(sma60, sma250)) {
      return semantic('均线区间 · 动能中性', 'NEUTRAL', 'yellow', component.reason_code, raw);
    }
    if (longDeviation >= 10) {
      return semantic('高于均线过多 · 偏热', 'NEGATIVE', 'red', component.reason_code, raw);
    }
    return semantic('站上主要均线 · 动能改善', 'POSITIVE', 'green', component.reason_code, raw);
  },
  price_position_252(component) {
    const value = inputNumber(component, ['value']);
    const raw = value == null ? '原始值缺失' : `252 日位置 ${percent(value, 1)}`;
    if (value == null) return semantic('数据不足', 'NEUTRAL', 'yellow', component?.reason_code, raw);
    if (value <= 20) return semantic('低位 · 有利', 'POSITIVE', 'green', component.reason_code, raw);
    if (value <= 40) return semantic('偏低 · 性价比较高', 'POSITIVE', 'green', component.reason_code, raw);
    if (value <= 60) return semantic('中位 · 中性', 'NEUTRAL', 'yellow', component.reason_code, raw);
    if (value <= 80) return semantic('偏高 · 谨慎', 'NEGATIVE', 'orange', component.reason_code, raw);
    return semantic('高位 · 风险', 'NEGATIVE', 'red', component.reason_code, raw);
  },
  pine(component) {
    const value = inputNumber(component, ['total_score', 'pine_score']);
    const raw = value == null ? '原始值缺失' : `Pine 综合 ${fixed(value, 1)}`;
    if (value == null) return semantic('Pine 数据不足', 'NEUTRAL', 'yellow', component?.reason_code, raw);
    if (value >= 7) return semantic('动能强共振', 'POSITIVE', 'green', component.reason_code, raw);
    if (value >= 4) return semantic('动能中性', 'NEUTRAL', 'yellow', component.reason_code, raw);
    if (value > 0) return semantic('动能初步改善', 'POSITIVE', 'green', component.reason_code, raw);
    return semantic('动能确认不足', 'NEGATIVE', 'orange', component.reason_code, raw);
  },
  rsi(component) {
    const value = inputNumber(component, ['value']);
    const raw = value == null ? '原始值缺失' : `RSI(14) ${fixed(value, 1)}`;
    if (value == null) return semantic('RSI 数据不足', 'NEUTRAL', 'yellow', component?.reason_code, raw);
    if (value <= 30) return semantic('超卖 · 修复机会', 'POSITIVE', 'green', component.reason_code, raw);
    if (value <= 45) return semantic('动能偏弱', 'NEGATIVE', 'orange', component.reason_code, raw);
    if (value <= 55) return semantic('动能中性', 'NEUTRAL', 'yellow', component.reason_code, raw);
    if (value <= 70) return semantic('动能偏强 · 估值谨慎', 'NEUTRAL', 'yellow', component.reason_code, raw);
    return semantic('超买 · 风险', 'NEGATIVE', 'red', component.reason_code, raw);
  },
  volume(component) {
    const input = component?.input_value;
    const status = typeof input === 'string' ? input : input?.status;
    const ratio = number(input?.ratio);
    const [label, direction, color] = VOLUME_STATES[status] || ['量能数据不足', 'NEUTRAL', 'yellow'];
    const raw = `${status || '缺失'}${ratio == null ? '' : ` · 量比 ${fixed(ratio, 2)}`}`;
    return semantic(label, direction, color, component?.reason_code, raw);
  },
});

export function signalBand(score) {
  const value = number(score);
  if (value == null) return null;
  return SIGNAL_BAND_REGISTRY.find(
    band => value >= band.min && (band.max === 100 ? value <= band.max : value < band.max),
  ) || null;
}

function componentSemantic(component) {
  const classifier = COMPONENT_SEMANTIC_REGISTRY[component?.component_id];
  return classifier
    ? classifier(component)
    : semantic('状态不可用', 'NEUTRAL', 'yellow', component?.reason_code, '原始值缺失');
}

function indexOptions(selected) {
  return Object.entries(INDEX_DISPLAY_REGISTRY).map(([code, entry]) => (
    `<option value="${code}"${selected === code ? ' selected' : ''}>${escapeHtml(entry.name)} · ${code}</option>`
  )).join('');
}

function modeOptions(selected = 'v2_unified') {
  return [
    ['v2_unified', 'V2 统一计算（默认）'],
    ['original_replay', '历史原始回放'],
    ['v1_comparison', 'V1 历史对照'],
  ].map(([value, label]) => (
    `<option value="${value}"${selected === value ? ' selected' : ''}>${label}</option>`
  )).join('');
}

function controls(indexCode, tradeDate, viewMode) {
  const dateValue = tradeDate === 'latest' ? '' : escapeHtml(tradeDate || '');
  return `<div class="header-controls">
    <input type="date" class="date-input" id="v2-hdr-date" value="${dateValue}" aria-label="历史日期">
    <select id="v2-idx-sel" aria-label="指数">${indexOptions(indexCode)}</select>
    <select id="v2-view-mode" aria-label="历史评分口径">${modeOptions(viewMode)}</select>
  </div>`;
}

function identityLabel(vm) {
  if (vm.view_mode === 'original_replay') return '历史原始回放 · 当时点已验证';
  if (vm.view_mode === 'v1_comparison') return 'V1历史对照 · 非当时点验证';
  return '历史计算 · 非当时点验证';
}

function renderHeader(vm, state) {
  const registry = INDEX_DISPLAY_REGISTRY[vm.index_code] || {name: `指数 ${vm.index_code}`};
  const fixture = vm.fixture_label === 'Synthetic Test Fixture';
  const technical = vm.identity || {};
  return `<header class="card dashboard-header">
    <div class="header-bar">
      <div class="header-left">
        <h1>${escapeHtml(registry.name)} · ${escapeHtml(vm.index_code)}</h1>
        <div class="header-date">数据日期：${escapeHtml(vm.trade_date)}</div>
      </div>
      <span class="identity-chip ${vm.point_in_time_verified ? 'verified' : 'calculation'}">${identityLabel(vm)}</span>
    </div>
    ${controls(vm.index_code, vm.trade_date, vm.view_mode)}
    <details class="technical-details">
      <summary>技术信息</summary>
      <div>Score Profile：${escapeHtml(vm.score_profile_version || '—')}</div>
      <div>Pine：${escapeHtml(vm.pine_rule_version || '—')} · Timeframe：${escapeHtml(vm.timeframe_identity || '—')}</div>
      <div>Version tuple：${escapeHtml(technical.version_tuple_digest || '—')}</div>
      ${fixture ? '<div class="fixture-warning">Synthetic Test Fixture · Local Candidate Test Data</div>' : ''}
      ${vm.calculation_disclaimer ? `<div>${escapeHtml(vm.calculation_disclaimer)}</div>` : ''}
    </details>
  </header>`;
}

function renderHero(vm) {
  const score = number(vm.score?.total_score);
  const band = signalBand(score);
  if (score == null || !band) {
    return '<section class="score-hero"><div class="hero-title">综合值博率评分</div><div class="missing-value">数据不足，暂无法计算</div></section>';
  }
  const width = Math.max(0, Math.min(100, score));
  return `<section class="score-hero">
    <div class="hero-title">综合值博率评分</div>
    <div class="score-big semantic-${band.color}">${fixed(score, 1)}<span>/100</span></div>
    <div class="signal-pill semantic-bg-${band.color}">${band.label}</div>
    <div class="scale-track"><div class="scale-fill" style="width:${width}%"></div></div>
    <div class="hero-breakdown">
      <span>估值 <b>${fixed(vm.score.valuation_score, 1)}</b></span>
      <span>技术 <b>${fixed(vm.score.technical_score, 1)}</b></span>
      <span>趋势 <b>${number(vm.score.trend_adjustment) > 0 ? '+' : ''}${fixed(vm.score.trend_adjustment, 1)}</b></span>
    </div>
    <div class="operation-reference">${escapeHtml(band.operation)}</div>
  </section>`;
}

function renderKpis(vm) {
  const market = vm.market || {};
  const spread = number(market.yield_spread?.value);
  return `<section class="kpi-grid" aria-label="顶部关键指标">
    <article class="kpi-card category-index"><div class="kpi-label">当前指数点位</div><div class="kpi-value">${points(market.index_point?.value)}</div></article>
    <article class="kpi-card category-did"><div class="kpi-label">DID 股息率</div><div class="kpi-value">${percent(market.did?.value)}</div></article>
    <article class="kpi-card category-cn10y"><div class="kpi-label">CN10Y 国债收益率</div><div class="kpi-value">${percent(market.cn10y?.value, 4)}</div></article>
    <article class="kpi-card category-spread"><div class="kpi-label">股债利差</div><div class="kpi-value">${spread != null && spread > 0 ? '+' : ''}${percent(spread)}</div><div class="kpi-sub">DID − CN10Y</div></article>
  </section>`;
}

function scoreProgress(component) {
  const score = number(component?.score);
  const max = number(component?.max_score);
  if (score == null) return {width: 0, text: '得分缺失'};
  if (max == null || max <= 0) return {width: 0, text: `${fixed(score, 1)}/满分配置异常`};
  return {
    width: Math.max(0, Math.min(100, score / max * 100)),
    text: `${fixed(score, 1)}/${fixed(max, 1)}`,
  };
}

function quantRow(component) {
  const info = componentSemantic(component);
  const progress = scoreProgress(component);
  return `<div class="score-row" data-component="${escapeHtml(component.component_id)}">
    <div class="score-row-heading">
      <span class="score-row-label">${escapeHtml(COMPONENT_NAMES[component.component_id] || component.component_id)}</span>
      <span class="score-row-raw">${escapeHtml(info.raw_text)}</span>
    </div>
    <div class="score-row-progress">
      <div class="score-bar-wrap"><div class="score-bar-fill semantic-bg-${info.display_color}" style="width:${progress.width}%"></div></div>
      <span class="score-row-pts">${progress.text}</span>
    </div>
    <div class="component-state semantic-${info.display_color}">${escapeHtml(info.short_label)}</div>
  </div>`;
}

function renderQuant(vm) {
  const valuation = (vm.valuation_components || []).map(quantRow).join('');
  const technical = (vm.technical_components || []).map(quantRow).join('');
  return `<section class="card" data-section="quant"><h2 class="card-title">①量化分解</h2>
    <div class="dim-label">估值面</div>${valuation}
    <div class="subtotal-row"><span>估值小计</span><span>${fixed(vm.score?.valuation_score, 1)}/60</span></div>
    <div class="dim-label">技术面</div>${technical}
    <div class="subtotal-row"><span>技术小计</span><span>${fixed(vm.score?.technical_score, 1)}/40</span></div>
  </section>`;
}

function normalizedPosition(vm) {
  const card = vm.cards?.price_position_252 || {};
  if (number(card.price_252_position_percent) != null) return number(card.price_252_position_percent);
  if (number(card.price_252_position_ratio) != null) return number(card.price_252_position_ratio) * 100;
  const legacy = number(card.value);
  if (legacy == null) return null;
  return vm.fixture_label === 'Synthetic Test Fixture' ? legacy * 100 : legacy;
}

function renderPosition(vm) {
  const card = vm.cards?.price_position_252 || {};
  const current = number(card.current_index_level ?? vm.market?.index_point?.value);
  const high = number(card.price_252_high ?? card.high);
  const low = number(card.price_252_low ?? card.low);
  const position = normalizedPosition(vm);
  const complete = [current, high, low, position].every(value => value != null) && high > low;
  const state = componentSemantic(componentById(vm, 'price_position_252'));
  return `<section class="card" data-section="price-position"><h2 class="card-title">②252日价格位置</h2>
    ${complete ? `<div class="gauge-track valuation-gauge"><div class="gauge-ptr" style="left:${Math.max(0, Math.min(100, position))}%"></div></div>
      <div class="gauge-labels"><span>0% 低位</span><span>50% 中位</span><span>100% 高位</span></div>` : '<div class="missing-value">数据不足，暂无法计算</div>'}
    <div class="pp252-row"><span>当前指数点位</span><span class="pp252-value">${points(current)}</span></div>
    <div class="pp252-row"><span>252 日最高</span><span class="pp252-value">${complete ? points(high) : '数据不足，暂无法计算'}</span></div>
    <div class="pp252-row"><span>252 日最低</span><span class="pp252-value">${complete ? points(low) : '数据不足，暂无法计算'}</span></div>
    <div class="pp252-row"><span>252 日位置</span><span class="pp252-value semantic-${state.display_color}">${complete ? percent(position, 1) : '数据不足，暂无法计算'}</span></div>
    <div class="field-note">位置字段单位：${escapeHtml(card.unit ?? card.position_unit ?? '字段不可用')} · ${escapeHtml(state.short_label)}</div>
  </section>`;
}

function renderPriceMa(vm) {
  const ma = vm.cards?.price_ma || {};
  const point = number(ma.point ?? vm.market?.index_point?.value);
  const rows = [['SMA60', ma.sma60], ['SMA120', ma.sma120], ['SMA250', ma.sma250]]
    .map(([name, value]) => {
      const average = number(value);
      const deviation = point != null && average != null && average > 0
        ? (point - average) / average * 100
        : null;
      const direction = deviation == null ? '' : deviation > 0 ? '↑' : deviation < 0 ? '↓' : '→';
      return `<tr><td>${name}</td><td>${points(average)}</td><td>${deviation == null ? '该口径暂无数据' : `${direction} ${deviation > 0 ? '+' : ''}${fixed(deviation, 1)}%`}</td></tr>`;
    }).join('');
  return `<section class="card" data-section="price-ma"><h2 class="card-title">③价格与均线结构</h2>
    <table class="data-table"><thead><tr><th>均线</th><th>点位</th><th>当前偏离</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="field-note">涨跌方向使用 ↑ / ↓ 与正负号，不使用红涨绿跌语义。</div>
  </section>`;
}

function percentileMeaning(value, lowMeaning, highMeaning) {
  const parsed = number(value);
  if (parsed == null) return '该口径暂无数据';
  return `${percent(parsed, 1)} · ${parsed <= 35 ? lowMeaning : parsed >= 65 ? highMeaning : '中位'}`;
}

function valuationConclusion(vm) {
  const ids = ['did', 'yield_spread', 'pb_percentile'];
  const states = ids.map(id => componentSemantic(componentById(vm, id)));
  const positive = states.filter(item => item.direction === 'POSITIVE').length;
  const negative = states.filter(item => item.direction === 'NEGATIVE').length;
  if (positive >= 2 && negative === 0) return semantic('低估或性价比较高', 'POSITIVE', 'green', '', '');
  if (negative >= 2) return semantic('偏贵或性价比偏低', 'NEGATIVE', 'orange', '', '');
  return semantic('估值整体合理', 'NEUTRAL', 'yellow', '', '');
}

function renderValuation(vm) {
  const card = vm.cards?.valuation_dashboard || {};
  const didComponent = componentById(vm, 'did');
  const pbComponent = componentById(vm, 'pb_percentile');
  const spreadComponent = componentById(vm, 'yield_spread');
  const did = number(card.did ?? inputNumber(didComponent, ['did_percent']));
  const didPct = number(card.did_percentile);
  const pb = number(card.pb ?? pbComponent?.input_value?.value);
  const pbPct = number(card.pb_percentile ?? inputNumber(pbComponent, ['percentile']));
  const pe = number(card.pe_ttm ?? card.pe);
  const pePct = number(card.pe_ttm_percentile);
  const spread = number(card.yield_spread ?? vm.market?.yield_spread?.value);
  const spreadPct = number(card.yield_spread_percentile ?? spreadComponent?.input_value?.yield_spread_prefix_percentile);
  const roe = number(card.roe);
  const conclusion = valuationConclusion(vm);
  return `<section class="card" data-section="valuation"><h2 class="card-title">④估值仪表盘</h2>
    <div class="valuation-summary semantic-bg-${conclusion.display_color}">${conclusion.short_label}</div>
    <div class="metric-grid">
      <div class="metric-item"><span>DID 当前值</span><b>${percent(did)}</b><small>${percentileMeaning(didPct, '低分位=历史股息率偏低', '高分位=历史股息率较高')}</small></div>
      <div class="metric-item"><span>PB 当前值</span><b>${fixed(pb, 4)}</b><small>${percentileMeaning(pbPct, '低分位=便宜', '高分位=偏贵')}</small></div>
      <div class="metric-item"><span>PE-TTM 当前值</span><b>${fixed(pe, 4)}</b><small>${pePct == null ? escapeHtml(card.field_availability?.pe_ttm_percentile || '该口径暂无数据') : percentileMeaning(pePct, '低分位=便宜', '高分位=偏贵')}</small></div>
      <div class="metric-item"><span>股债利差</span><b>${percent(spread)}</b><small>${percentileMeaning(spreadPct, '低分位=相对吸引力偏低', '高分位=相对吸引力较高')}</small></div>
      <div class="metric-item"><span>隐含 ROE</span><b>${percent(roe)}</b><small>由同日 PB / PE-TTM 口径推导，不等同真实 ROE</small></div>
    </div>
  </section>`;
}

function renderMomentum(vm) {
  const card = vm.cards?.momentum || {};
  const rsiState = componentSemantic(componentById(vm, 'rsi'));
  const pineState = componentSemantic(componentById(vm, 'pine'));
  const detailAvailable = ['impulse_macd_score', 'andean_score', 'squeeze_score']
    .every(key => number(card[key]) != null);
  return `<section class="card" data-section="momentum"><h2 class="card-title">⑤动能指标</h2>
    <div class="metric-grid">
      <div class="metric-item"><span>RSI(14)</span><b>${fixed(card.rsi, 1)}</b><small class="semantic-${rsiState.display_color}">${escapeHtml(rsiState.short_label)}</small></div>
      <div class="metric-item"><span>Pine 综合得分</span><b>${number(card.pine_score) == null ? '该口径暂无数据' : `${fixed(card.pine_score, 1)}/${fixed(card.pine_max_score, 1)}`}</b><small class="semantic-${pineState.display_color}">${escapeHtml(pineState.short_label)}</small></div>
    </div>
    ${detailAvailable ? `<div class="pine-breakdown">
      <span>Impulse MACD <b>${fixed(card.impulse_macd_score, 1)}</b></span>
      <span>Andean <b>${fixed(card.andean_score, 1)}</b></span>
      <span>Squeeze <b>${fixed(card.squeeze_score, 1)}</b></span>
    </div>` : `<div class="field-note">${escapeHtml(card.pine_detail_availability || '该 Pine 口径未保存三分项')}</div>`}
  </section>`;
}

function renderMarketEnvironment(vm) {
  const card = vm.cards?.market_environment || {};
  const cn10y = number(card.cn10y?.value ?? card.cn10y ?? vm.market?.cn10y?.value);
  const spread = number(card.yield_spread?.value ?? card.yield_spread ?? vm.market?.yield_spread?.value);
  return `<section class="card" data-section="market-environment"><h2 class="card-title">⑥市场环境</h2>
    <div class="environment-grid">
      <div class="environment-box environment-cn10y"><span>CN10Y 国债收益率</span><b>${percent(cn10y, 4)}</b></div>
      <div class="environment-box environment-spread"><span>股债利差</span><b>${spread != null && spread > 0 ? '+' : ''}${percent(spread)}</b></div>
    </div>
    <div class="field-note">单位均为百分比；股债利差 = DID − CN10Y。</div>
  </section>`;
}

function semanticFactors(vm) {
  const entries = [...(vm.valuation_components || []), ...(vm.technical_components || [])]
    .map(component => ({component, info: componentSemantic(component)}));
  const rank = entry => number(entry.component.score) ?? -Infinity;
  const positive = entries.filter(entry => entry.info.direction === 'POSITIVE')
    .sort((a, b) => rank(b) - rank(a)).slice(0, 5);
  const negative = entries.filter(entry => entry.info.direction === 'NEGATIVE')
    .sort((a, b) => rank(a) - rank(b)).slice(0, 5);
  return {positive, negative};
}

function factorList(title, entries, color, emptyText) {
  const body = entries.length
    ? entries.map(({component, info}) => `<div class="analyst-item"><span class="analyst-dot ${color}"></span><p><b>${escapeHtml(COMPONENT_NAMES[component.component_id])}</b>：${escapeHtml(info.short_label)}（${escapeHtml(info.raw_text)}）</p></div>`).join('')
    : `<div class="field-note">${emptyText}</div>`;
  return `<div class="analyst-block"><h3>${title}</h3>${body}</div>`;
}

function renderJudgment(vm) {
  const factors = semanticFactors(vm);
  const band = signalBand(vm.score?.total_score);
  const trend = vm.trend || {};
  const positiveNames = factors.positive.slice(0, 2).map(item => COMPONENT_NAMES[item.component.component_id]);
  const negativeNames = factors.negative.slice(0, 2).map(item => COMPONENT_NAMES[item.component.component_id]);
  const judgment = `当前综合值博率处于“${band?.label || '数据不足'}”，`
    + `主要利多来自${positiveNames.length ? positiveNames.join('、') : '暂无明确项目'}，`
    + `主要制约来自${negativeNames.length ? negativeNames.join('、') : '暂无明确项目'}；`
    + `${number(trend.trend_bonus ?? trend.score) === 0 ? '趋势动量暂未加减分，适合保持关注并等待进一步确认。' : '趋势动量已按冻结规则计入总分。'}`;
  const references = Array.isArray(trend.reference_dates) && trend.reference_dates.length
    ? trend.reference_dates.join('、')
    : trend.field_availability?.reference_dates || '趋势窗口不完整';
  const bonus = number(trend.trend_bonus ?? trend.score ?? vm.score?.trend_adjustment);
  return `<section class="card" data-section="judgment"><h2 class="card-title">⑦综合研判</h2>
    ${factorList('利多因素', factors.positive, 'green', '当前没有被规则判定为明确利多的组件。')}
    ${factorList('利空因素', factors.negative, 'red', '当前没有被规则判定为明确利空的组件。')}
    <div class="analyst-block"><h3>综合判断</h3><p>${escapeHtml(judgment)}</p></div>
    <div class="analyst-block"><h3>趋势动量加减分明细</h3>
      <div class="trend-line"><span>趋势动量</span><b>${bonus == null ? '该口径暂无数据' : `${bonus > 0 ? '+' : ''}${fixed(bonus, 1)} 分`}</b></div>
      <div class="trend-line"><span>窗口状态</span><b>${trend.trend_window_complete === true ? '完整' : trend.trend_window_complete === false ? '不完整' : '当时点快照未保存该字段'}</b></div>
      <div class="trend-line"><span>参考交易日</span><b>${escapeHtml(references)}</b></div>
      <div class="trend-line"><span>原因</span><b>${escapeHtml(trend.trigger_reason || trend.reason_code || '该口径暂无数据')}</b></div>
    </div>
  </section>`;
}

function renderSignals(vm) {
  const current = signalBand(vm.score?.total_score);
  const rows = SIGNAL_BAND_REGISTRY.map(band => (
    `<tr class="signal-${band.color}${current === band ? ' signal-current' : ''}">
      <td>${band.range}</td><td>${band.label}${current === band ? '<span class="current-badge">当前</span>' : ''}</td><td>${band.operation}</td>
    </tr>`
  )).join('');
  return `<section class="card" data-section="signals"><h2 class="card-title">⑧评分信号</h2>
    <div class="signal-table-wrap"><table class="signal-table"><thead><tr><th>分数区间</th><th>评分信号</th><th>操作参考</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="research-disclaimer">仅供研究参考，不构成投资建议</div>
  </section>`;
}

function renderUnavailable(state, loading = false) {
  const exactUnavailable = state.error === 'HISTORICAL_DASHBOARD_UNAVAILABLE';
  return `<main id="app">
    <section class="${loading ? 'loader' : 'error-card'}" data-state="${loading ? 'LOADING' : 'UNAVAILABLE'}">
      <h1>${loading ? '正在获取 DashboardViewModel…' : exactUnavailable ? '该日期无可用历史评分' : 'Dashboard 不可用'}</h1>
      ${loading ? '' : `<p>${escapeHtml(state.error || 'HISTORICAL_DASHBOARD_UNAVAILABLE')}</p>`}
      ${controls(state.index_code, state.trade_date, state.view_mode)}
    </section>
  </main>`;
}

export function renderApp(state) {
  const vm = state.dashboard_view_model;
  if (state.loading) return renderUnavailable(state, true);
  if (state.error || !vm) return renderUnavailable(state, false);
  return `<main id="app">
    ${renderHeader(vm, state)}
    ${renderHero(vm)}
    ${renderKpis(vm)}
    ${renderQuant(vm)}
    ${renderPosition(vm)}
    ${renderPriceMa(vm)}
    ${renderValuation(vm)}
    ${renderMomentum(vm)}
    ${renderMarketEnvironment(vm)}
    ${renderJudgment(vm)}
    ${renderSignals(vm)}
  </main>`;
}
