(function(root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DividendScorePosition = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  'use strict';

  var CONTRACT = Object.freeze({
    schemaVersion: 'historical_score_position_snapshot_v1',
    moduleVersion: 'Position V1.0',
    ruleVersion: 'V1.0',
    snapshotPath: 'assets/research/score-position/position-v1.0/latest.json',
  });
  var COMPONENT_LABELS = Object.freeze({
    valuation_score: '估值',
    macro_score: '宏观',
    technical_score: '技术',
    pine_score: 'Pine',
  });

  function requireCondition(condition, message) {
    if (!condition) throw new Error(message);
  }

  function finiteRange(value, lower, upper, field) {
    requireCondition(typeof value === 'number' && Number.isFinite(value), field + ' must be finite');
    requireCondition(value >= lower && value <= upper, field + ' outside range');
  }

  function validateItem(item, asOfDate) {
    requireCondition(item && typeof item === 'object' && !Array.isArray(item), 'item invalid');
    [
      'code','name','date','rule_version','status','score','historical_percentile',
      'regime','position_label','recent_change','component_positions',
      'historical_min_score','historical_min_date','historical_max_score',
      'historical_max_date','distance_from_high','distance_from_low',
      'historical_observation_count','percentile_method'
    ].forEach(function(field) {
      requireCondition(Object.prototype.hasOwnProperty.call(item, field), 'item missing ' + field);
    });
    requireCondition(/^\d{6}$/.test(item.code), 'item code invalid');
    requireCondition(item.date === asOfDate, 'item date mismatch');
    requireCondition(item.rule_version === CONTRACT.ruleVersion, 'item rule_version mismatch');
    requireCondition(item.status === 'complete', 'item status incomplete');
    finiteRange(item.score, 0, 100, 'score');
    finiteRange(item.historical_percentile, 0, 100, 'historical_percentile');
    finiteRange(item.historical_min_score, 0, 100, 'historical_min_score');
    finiteRange(item.historical_max_score, 0, 100, 'historical_max_score');
    requireCondition(item.historical_min_score <= item.score && item.score <= item.historical_max_score, 'score outside extrema');
    requireCondition(item.recent_change && typeof item.recent_change === 'object', 'recent_change invalid');
    ['5d','20d','60d'].forEach(function(key) {
      var value = item.recent_change[key];
      requireCondition(Object.prototype.hasOwnProperty.call(item.recent_change, key), 'trend missing ' + key);
      requireCondition(value === null || (typeof value === 'number' && Number.isFinite(value)), 'trend invalid ' + key);
    });
    requireCondition(item.component_positions && typeof item.component_positions === 'object', 'component_positions invalid');
    requireCondition(Object.keys(item.component_positions).sort().join(',') === Object.keys(COMPONENT_LABELS).sort().join(','), 'component set invalid');
    Object.keys(COMPONENT_LABELS).forEach(function(key) {
      var component = item.component_positions[key];
      requireCondition(component && typeof component === 'object', 'component missing ' + key);
      requireCondition(Object.prototype.hasOwnProperty.call(component, 'score'), 'component score missing ' + key);
      requireCondition(Object.prototype.hasOwnProperty.call(component, 'historical_percentile'), 'component percentile missing ' + key);
      if (component.score !== null) finiteRange(component.score, 0, 100, key + '.score');
      if (component.historical_percentile !== null) finiteRange(component.historical_percentile, 0, 100, key + '.historical_percentile');
    });
    return item;
  }

  function validateSnapshot(payload) {
    requireCondition(payload && typeof payload === 'object' && !Array.isArray(payload), 'snapshot invalid');
    requireCondition(payload.schema_version === CONTRACT.schemaVersion, 'schema_version mismatch');
    requireCondition(payload.module_version === CONTRACT.moduleVersion, 'module_version mismatch');
    requireCondition(payload.rule_version === CONTRACT.ruleVersion, 'rule_version mismatch');
    requireCondition(payload.status === 'success', 'snapshot status invalid');
    requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(payload.as_of_date || ''), 'as_of_date invalid');
    requireCondition(payload.source && payload.source.kind === 'historical_score_curve_sqlite_read_only', 'source invalid');
    requireCondition(/^[0-9a-f]{64}$/.test(payload.source.database_sha256 || ''), 'database_sha256 invalid');
    requireCondition(/^[0-9a-f]{64}$/.test(payload.snapshot_sha256 || ''), 'snapshot_sha256 invalid');
    requireCondition(Array.isArray(payload.items) && payload.items.length > 0, 'items invalid');
    var codes = [];
    payload.items.forEach(function(item) {
      validateItem(item, payload.as_of_date);
      requireCondition(codes.indexOf(item.code) < 0, 'duplicate item code');
      codes.push(item.code);
    });
    return payload;
  }

  function selectPosition(payload, request) {
    validateSnapshot(payload);
    requireCondition(request && /^\d{6}$/.test(request.code || ''), 'selected code invalid');
    requireCondition(request.date === payload.as_of_date, 'selected date mismatch');
    requireCondition(request.ruleVersion === CONTRACT.ruleVersion, 'selected rule_version mismatch');
    requireCondition(request.moduleVersion === CONTRACT.moduleVersion, 'selected module_version mismatch');
    var item = payload.items.find(function(candidate) { return candidate.code === request.code; });
    requireCondition(item && item.code === request.code, 'selected code unavailable');
    return item;
  }

  function sameRequest(left, right) {
    return !!left && !!right && left.code === right.code && left.activationId === right.activationId;
  }

  function createController(options) {
    var sequence = 0;
    var current = null;
    function begin(request) {
      sequence += 1;
      current = {token: sequence, request: request};
      options.view.clear();
      options.view.loading(request.code);
      return sequence;
    }
    async function load(request) {
      if (!current || !sameRequest(current.request, request)) begin(request);
      var operation = current;
      try {
        var payload = await options.fetchSnapshot(request);
        await (options.verifySnapshot || (async function(value) { return validateSnapshot(value); }))(payload);
        var item = selectPosition(payload, request);
        if (operation !== current) return {discarded: true};
        if (options.isCurrent) {
          try {
            if (!options.isCurrent(request)) return {discarded: true};
          } catch (identityError) {
            return {discarded: true};
          }
        }
        options.view.ready(item, payload);
        return {item: item, snapshot: payload};
      } catch (error) {
        var stillCurrent = false;
        try { stillCurrent = !options.isCurrent || options.isCurrent(request); } catch (identityError) { stillCurrent = false; }
        if (operation === current && stillCurrent) options.view.unavailable();
        return {error: error};
      }
    }
    return Object.freeze({begin: begin, load: load});
  }

  function displayNumber(value) {
    return value === null || value === undefined ? '—' : Number(value).toFixed(2);
  }

  function makeBrowserView(documentRef) {
    var state = documentRef.getElementById('score-position-state');
    var content = documentRef.getElementById('score-position-content');
    var textIds = [
      'score-position-identity','score-position-regime','score-position-score',
      'score-position-percentile','score-position-label'
    ];
    function clear() {
      content.hidden = true;
      state.hidden = false;
      state.textContent = '';
      textIds.forEach(function(id) { var element = documentRef.getElementById(id); if (element) element.textContent = ''; });
      documentRef.getElementById('score-position-trends').innerHTML = '';
      documentRef.getElementById('score-position-components').innerHTML = '';
      documentRef.getElementById('score-position-gauge-fill').style.width = '0%';
      documentRef.getElementById('score-position-gauge-marker').style.left = '0%';
      documentRef.getElementById('score-position-card').removeAttribute('data-code');
    }
    function loading(code) {
      state.textContent = '正在读取 ' + code + ' 的历史位置…';
    }
    function ready(item, snapshot) {
      documentRef.getElementById('score-position-card').dataset.code = item.code;
      documentRef.getElementById('score-position-identity').textContent = item.name + ' · ' + item.code + ' · ' + item.date + ' · Score ' + item.rule_version + ' · ' + snapshot.module_version;
      documentRef.getElementById('score-position-regime').textContent = item.regime;
      documentRef.getElementById('score-position-score').textContent = displayNumber(item.score);
      documentRef.getElementById('score-position-percentile').textContent = displayNumber(item.historical_percentile) + '%';
      documentRef.getElementById('score-position-label').textContent = item.position_label;
      documentRef.getElementById('score-position-gauge-fill').style.width = item.historical_percentile + '%';
      documentRef.getElementById('score-position-gauge-marker').style.left = item.historical_percentile + '%';
      documentRef.getElementById('score-position-trends').innerHTML = [5,20,60].map(function(days) {
        var value = item.recent_change[days + 'd'];
        var sign = value > 0 ? '+' : '';
        return '<div class="score-position-trend"><span>' + days + ' 日</span><strong>' + (value === null ? '—' : sign + displayNumber(value)) + '</strong></div>';
      }).join('');
      documentRef.getElementById('score-position-components').innerHTML = Object.keys(COMPONENT_LABELS).map(function(key) {
        var component = item.component_positions[key];
        var percentile = component.historical_percentile;
        return '<div class="score-position-component"><div><span>' + COMPONENT_LABELS[key] + '</span><strong>' + (percentile === null ? '—' : displayNumber(percentile) + '%') + '</strong></div><div class="score-position-component-track"><i style="width:' + (percentile === null ? 0 : percentile) + '%"></i></div><small>分项评分 ' + displayNumber(component.score) + '</small></div>';
      }).join('');
      state.hidden = true;
      content.hidden = false;
    }
    function unavailable() {
      clear();
      state.textContent = '历史位置数据暂不可用。';
    }
    return Object.freeze({clear: clear, loading: loading, ready: ready, unavailable: unavailable});
  }

  var browserController = null;
  function ensureBrowserController() {
    requireCondition(typeof document !== 'undefined' && typeof fetch === 'function', 'browser environment unavailable');
    if (!browserController) {
      browserController = createController({
        view: makeBrowserView(document),
        fetchSnapshot: function() {
          var url = new URL(CONTRACT.snapshotPath, document.baseURI).href;
          return fetch(url, {cache: 'no-store'}).then(function(response) {
            if (!response.ok) throw new Error('score position snapshot HTTP ' + response.status);
            return response.json();
          });
        },
        isCurrent: function(request) {
          if (typeof root.isCurrentIndexRequest !== 'function') return true;
          return root.isCurrentIndexRequest({activationId: request.activationId, requestedIndexCode: request.code});
        },
      });
    }
    return browserController;
  }

  function beginBrowser(request) {
    return ensureBrowserController().begin(request);
  }

  function loadBrowser(request) {
    return ensureBrowserController().load(request);
  }

  return Object.freeze({
    CONTRACT: CONTRACT,
    validateSnapshot: validateSnapshot,
    selectPosition: selectPosition,
    createController: createController,
    begin: beginBrowser,
    load: loadBrowser,
  });
});
