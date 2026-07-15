(function(root){
  'use strict';
  var params=new URLSearchParams(root.location&&root.location.search||'');
  var api=root.DIVIDEND_HISTORY_API||params.get('history_api')||root.DATA_API_DIV||'http://127.0.0.1:8788';
  var originalMaTrend=root.maTrendHistory;
  var originalResolve=root.resolvePineScore;
  var current=null;

  function error(kind,message){var value=new Error(message);value.kind=kind;return value;}
  function detail(payload,fallback){return payload&&(payload.detail||payload.reason||payload.error)||fallback;}
  function mapPayload(payload){
    var v=payload.valuation||{},m=payload.macro||{},t=payload.technical||{};
    current={code:payload.code,date:payload.date,maHistory:t.priceMaHistory||[],pine:payload.pine||null};
    return {
      _mode:'historical_calculation',_fetchedDate:payload.date,index:payload.code,name:payload.name,
      price:t.close,price_date:payload.date,did:v.dividendYield==null?null:v.dividendYield*100,did_date:v.date,
      did_pct:v.didPercentileFullHistory,pb:v.pb,pb_pct:v.pbPercentileFullHistory,
      pe_ttm:v.peTtm,pe_ttm_pct:v.peTtmPercentileFullHistory,roe:v.roe,
      roe_display:v.roeImpliedTtm==null?null:v.roeImpliedTtm*100,estimated:v.estimated,
      source:'Historical Calculation',update_time:'target-date calculation',
      cn10y:m.status==='available'?m.cn10y:null,yield_spread:m.yieldSpread,
      yield_spread_percentile:m.yieldSpreadPercentile,macro_window:m.window,
      macro_sample_count:m.sampleCount,macro_valuation_date:m.valuationDate,macro_date:m.macroDate,
      macro_source:m.source,macro_quality:m.quality,macro_estimated:m.estimated,macro_available:m.status==='available',
      sma60:t.sma60,sma120:t.sma120,sma250:t.sma250,rsi:t.rsi14,
      vol_ratio:t.volumeRatio5d,volume_status:t.volumeStatus,
      price_position_252:t.pricePosition252,price_252_low:t.price252Low,price_252_high:t.price252High,
      price_position_252_estimated:t.pricePosition252Estimated,technical_date:t.date,
      technical_source:t.source,technical_quality:t.quality,technical_fallback_used:false,technical_available:t.status==='available'
    };
  }

  async function load(date){
    var config=root.getIndexConfig(root._selIndex);if(!config)throw error('CONFIG_ERROR','当前指数配置不可用');
    var url=api+'/history/calculate?code='+encodeURIComponent(config.apiCode)+'&date='+encodeURIComponent(date);
    var response;try{response=await root.fetch(url,{cache:'no-store'});}catch(cause){throw error('API_FAILED','History Calculation API连接失败：'+(cause.message||cause));}
    var payload=null;try{payload=await response.json();}catch(_){throw error('API_FAILED','History Calculation API返回不可解析（HTTP '+response.status+'）');}
    if(!response.ok){
      var code=payload&&payload.error;var message=detail(payload,'HTTP '+response.status);
      if(code==='INSUFFICIENT_HISTORY')throw error(code,'数据不足：'+message);
      if(code==='DATE_UNAVAILABLE'||code==='DATE_NOT_FOUND')throw error(code,'日期不可用：'+message);
      throw error(code||'API_FAILED','历史计算失败：'+message);
    }
    if(payload.source!=='historical_calculation'||payload.notLatest!==true||payload.notArchive!==true)throw error('CONTRACT_FAILED','历史计算响应来源校验失败');
    return mapPayload(payload);
  }

  root.loadHistoricalData=load;
  root.maTrendHistory=function(code,targetDate){
    if(current&&current.code===code&&current.date===targetDate){
      return current.maHistory.map(function(item){return{code:code,date:item.date,_form:{e_price:item.close,e_sma250:item.sma250}};});
    }
    return originalMaTrend?originalMaTrend(code,targetDate):[];
  };
  root.resolvePineScore=function(){
    var override=root.document.getElementById('pine-manual-override-enabled');
    if(override&&override.checked)return originalResolve();
    var date=root.document.getElementById('header-date');
    if(current&&current.code===root._selIndex&&date&&current.date===date.value&&current.pine&&current.pine.status==='available'){
      return{score:current.pine.score,source:'Python Auto',mode:'auto',code:current.code,date:current.date,engineVersion:current.pine.engineVersion,reason:null};
    }
    return originalResolve();
  };
  function renderHistoricalPine(){
    var result=root.resolvePineScore();
    function text(id,value){var el=root.document.getElementById(id);if(el)el.textContent=value;}
    text('pine-auto-score',Number(result.score).toFixed(1));text('pine-auto-source',result.source);
    text('pine-auto-date',result.date||'--');text('pine-auto-engine',result.engineVersion||'--');
    text('pine-auto-mode',result.mode==='auto'?'Auto':result.mode==='override'?'Override':'Manual');
    text('pine-auto-status',result.reason||'Pine 输入已通过历史计算引擎');
  }
  root.fillHistoricalDate=async function(){
    var input=root.g('backfill-date-div'),button=root.g('backfill-button-div'),date=input&&input.value;
    if(!date){root.showMsg('⚠️ 日期不可用：请先选择历史交易日');return;}
    var original=button?button.textContent:'';if(button){button.textContent='⏳ 计算中...';button.disabled=true;}
    root.showMsg('⏳ 正在动态计算 '+date+' 的历史指标…');
    try{
      var data=await load(date);root.clearHistoricalAutoFields();root.applyDivData(data,{force:true,historical:true});
      root.g('header-date').value=date;
      renderHistoricalPine();
      root.showMsg('✅ 数据来源：<strong>Historical Calculation</strong> · 日期：<strong>'+date+'</strong> · 已生成完整历史评分输入，请点击「计算评分」。');
    }catch(cause){console.error('[Dividend V1.2 historical calculation]',{date:date,index:root._selIndex,kind:cause.kind||'API_FAILED',error:cause});root.showMsg('⚠️ 回填失败：'+(cause.message||'历史计算失败'));}
    finally{if(button){button.textContent=original;button.disabled=false;}}
  };
  root.autoFillHistoryDiv=root.fillHistoricalDate;
  root.DividendHistoryShadow={api:api,mapPayload:mapPayload,load:load,renderPine:renderHistoricalPine,get current(){return current;}};
})(typeof globalThis!=='undefined'?globalThis:this);
