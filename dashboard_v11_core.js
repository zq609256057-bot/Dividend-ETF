(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DividendV11 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  var DEFAULT_RULES = Object.freeze({historyWindow: 20, supportBandPercent: 3, overheatPercent: 10, technicalWeight: 8});

  function finite(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function historyPoint(record) {
    var form = record && record._form ? record._form : record || {};
    var close = finite(form.e_price != null ? form.e_price : form.close);
    var sma250 = finite(form.e_sma250 != null ? form.e_sma250 : form.sma250);
    if (close === null || sma250 === null || sma250 <= 0) return null;
    return {close: close, sma250: sma250, below: close < sma250, deviation: (close - sma250) / sma250 * 100};
  }

  function priceMaStructureScore(closeValue, sma60Value, sma250Value, history, customRules) {
    var rules = Object.assign({}, DEFAULT_RULES, customRules || {});
    var close = finite(closeValue), sma60 = finite(sma60Value), sma250 = finite(sma250Value);
    if (close === null || sma250 === null || sma250 <= 0) {
      return {state: 'INSUFFICIENT', rawScore: 5, weightedScore: 4, deviationPercent: null, description: '均线数据不足'};
    }
    var points = (Array.isArray(history) ? history : []).map(historyPoint).filter(Boolean).slice(-rules.historyWindow);
    var deviation = (close - sma250) / sma250 * 100;
    var wasBelow = points.some(function(point) { return point.below; });
    var previousBelow = points.length > 0 && points[points.length - 1].below;
    var trailingBelow = 0;
    for (var index = points.length - 1; index >= 0 && points[index].below; index -= 1) trailingBelow += 1;
    var rawScore, state, description;

    if (close >= sma250 && deviation <= rules.supportBandPercent && wasBelow) {
      state = 'A_RECLAIM_SUPPORT';
      rawScore = previousBelow ? 10 : 9;
      description = 'A 跌破SMA250后重新站回支撑附近';
    } else if (close < sma250 && trailingBelow >= 1) {
      state = 'B_CONTINUED_DECLINE';
      rawScore = deviation >= -5 ? 8 : 7;
      description = 'B 跌破SMA250后未重新站回';
    } else if (close < sma250 && sma60 !== null && close >= Math.min(sma60, sma250)) {
      state = 'C_BETWEEN_MA';
      var span = Math.abs(sma250 - sma60);
      var bandPosition = span > 0 ? Math.max(0, Math.min(1, (sma250 - close) / span)) : 0.5;
      rawScore = Math.round((5 + bandPosition * 2) * 10) / 10;
      description = 'C 价格位于SMA60-SMA250之间';
    } else if (close < sma250) {
      state = wasBelow ? 'B_CONTINUED_DECLINE' : 'C_TREND_PENDING';
      rawScore = wasBelow ? 7 : 5;
      description = wasBelow ? 'B 跌破SMA250后继续下行' : 'C 当前低于SMA250，历史趋势待积累';
    } else if (deviation < rules.overheatPercent) {
      state = 'D_ABOVE_NEAR';
      rawScore = deviation < 5 ? 2 : 1;
      description = 'D 高于SMA250但偏离不足10%';
    } else {
      state = 'E_ABOVE_EXTENDED';
      rawScore = deviation < 15 ? 1 : 0;
      description = 'E 高于SMA250且偏离达到10%';
    }
    return {
      state: state,
      rawScore: rawScore,
      weightedScore: Math.round(rawScore / 10 * rules.technicalWeight * 100) / 100,
      deviationPercent: deviation,
      historyCount: points.length,
      description: description
    };
  }

  function unwrapHistoricalPayload(payload) {
    if (payload && payload.schema_version === 'dividend_indices_snapshot_v1') return payload;
    var data = payload && payload.data;
    if (Array.isArray(data)) {
      if (!data.length) return null;
      return data[0];
    }
    if (data && typeof data === 'object') return data;
    if (payload && (payload.price != null || payload.current_price != null)) return payload;
    return null;
  }

  return Object.freeze({DEFAULT_RULES: DEFAULT_RULES, priceMaStructureScore: priceMaStructureScore, unwrapHistoricalPayload: unwrapHistoricalPayload});
});
