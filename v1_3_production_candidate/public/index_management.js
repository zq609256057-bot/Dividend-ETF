(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DividendIndexManagement = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  var REQUIRED = ['code', 'name', 'apiCode', 'market', 'category'];

  function normalize(payload) {
    if (!payload || !Array.isArray(payload.indices)) throw new Error('指数目录响应无效');
    return payload.indices.map(function(item) {
      REQUIRED.forEach(function(key) {
        if (typeof item[key] !== 'string' || !item[key]) throw new Error('指数目录缺少字段：' + key);
      });
      if (!/^\d{6}$/.test(item.code)) throw new Error('指数代码格式无效：' + item.code);
      return Object.freeze({
        code: item.code,
        name: item.name,
        apiCode: item.apiCode,
        market: item.market,
        category: item.category,
        description: item.description || '',
        historyAvailable: item.historyAvailable === true,
        latestAvailable: item.latestAvailable === true,
      });
    });
  }

  function findByCode(indices, value) {
    var code = String(value || '').trim().toUpperCase();
    return indices.find(function(item) { return item.code === code || item.apiCode === code; }) || null;
  }

  async function load(apiBase, fetchImpl) {
    var response = await fetchImpl(String(apiBase).replace(/\/$/, '') + '/indices', {cache: 'no-store'});
    if (!response.ok) throw new Error('指数目录 HTTP ' + response.status);
    return normalize(await response.json());
  }

  return Object.freeze({normalize: normalize, findByCode: findByCode, load: load});
});
