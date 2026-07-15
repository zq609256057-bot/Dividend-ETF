(function(root,factory){
  var api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.PineScoreResolver=api;
  if(root.document){
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',api.init,{once:true});
    else api.init();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';

  var DEFAULTS={
    PINE_AUTO_ENABLED:false,
    apiUrl:'https://dividend-dashboard-api-shadow.zq609256057.workers.dev/api/shadow/pine/latest',
    schemaVersion:'pine_v7_shadow_v1',
    engineVersion:'pine-v7-red-rocket-final',
    allowedProductionScoreEffects:['none'],
    tradeSemantics:'none',
    maxAgeCalendarDays:7,
    timeoutMs:5000
  };
  var config=Object.assign({},DEFAULTS,root.PINE_AUTO_CONFIG||{});
  var payload=null;
  var lastError=null;
  var initialized=false;
  var loading=false;

  function dateValue(text){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text||''))return NaN;
    var bits=text.split('-').map(Number);
    var value=Date.UTC(bits[0],bits[1]-1,bits[2]);
    var date=new Date(value);
    return date.getUTCFullYear()===bits[0]&&date.getUTCMonth()===bits[1]-1&&date.getUTCDate()===bits[2]?value:NaN;
  }
  function beijingToday(){
    var parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    var map={};parts.forEach(function(part){map[part.type]=part.value;});
    return map.year+'-'+map.month+'-'+map.day;
  }
  function selectedDate(){
    var field=root.document&&root.document.getElementById('header-date');
    return field&&dateValue(field.value)?field.value:beijingToday();
  }
  function selectedCode(){return ['000922','930955'].includes(root._selIndex)?root._selIndex:'930955';}
  function manualScore(){
    var field=root.document&&root.document.getElementById('e_tech3');
    var score=field&&field.value!==''?Number(field.value):NaN;
    return Number.isFinite(score)?Math.max(0,Math.min(10,Math.trunc(score))):null;
  }
  function overrideEnabled(){var field=root.document&&root.document.getElementById('pine-manual-override-enabled');return !!(field&&field.checked);}
  function validateIndex(item,asOfDate){
    if(!item||!['000922','930955'].includes(item.code))throw new Error('index code invalid');
    var itemDate=dateValue(item.date),currentDate=dateValue(asOfDate||beijingToday());
    if(!Number.isFinite(itemDate)||itemDate>currentDate)throw new Error('Pine date is later than current trading date');
    if((currentDate-itemDate)/86400000>config.maxAgeCalendarDays)throw new Error('Pine data expired');
    if(!item.pineV7||!Number.isFinite(item.pineV7.score)||item.pineV7.score<0||item.pineV7.score>10)throw new Error('pineScore invalid');
    if(item.pineV7.engineVersion!==config.engineVersion)throw new Error('engineVersion invalid');
    if(!item.andean||typeof item.andean.state!=='string'||!item.andean.state)throw new Error('Andean state invalid');
    if(!item.impulseMacd||typeof item.impulseMacd.state!=='string'||!item.impulseMacd.state)throw new Error('MACD state invalid');
    if(!item.squeeze||typeof item.squeeze.state!=='string'||!item.squeeze.state)throw new Error('Squeeze state invalid');
    var risk=item.riskLabel;
    if(!risk||risk.scoreEffect!=='none'||risk.tradeSemantics!==config.tradeSemantics)throw new Error('risk semantics invalid');
    return item;
  }
  function validatePayload(value,asOfDate){
    if(!value||value.ok!==true||value.schemaVersion!==config.schemaVersion)throw new Error('schemaVersion invalid');
    if(value.shadowOnly!==true)throw new Error('shadowOnly must be true');
    if(!config.allowedProductionScoreEffects.includes(value.productionScoreEffect))throw new Error('productionScoreEffect not allowed');
    if(value.tradeSemantics!==config.tradeSemantics)throw new Error('tradeSemantics invalid');
    if(!Array.isArray(value.indices))throw new Error('indices missing');
    value.indices.forEach(function(item){validateIndex(item,asOfDate);});
    ['000922','930955'].forEach(function(code){if(!value.indices.some(function(item){return item.code===code;}))throw new Error('index missing: '+code);});
    return value;
  }
  function resolve(options){
    options=options||{};
    var manual=options.manualScore===undefined?manualScore():options.manualScore;
    var override=options.manualOverride===undefined?overrideEnabled():!!options.manualOverride;
    var code=options.code||selectedCode();
    var asOf=options.asOfDate||selectedDate();
    if(override&&Number.isFinite(manual))return{score:manual,source:'Manual Override',mode:'override',code:code,date:asOf,engineVersion:null,reason:null};
    if(config.PINE_AUTO_ENABLED&&payload){
      try{
        validatePayload(payload,asOf);
        var item=payload.indices.find(function(candidate){return candidate.code===code;});
        if(!item)throw new Error('selected index missing');
        return{score:item.pineV7.score,source:'Python Auto',mode:'auto',code:code,date:item.date,engineVersion:item.pineV7.engineVersion,reason:null};
      }catch(error){lastError=error;}
    }
    return{score:Number.isFinite(manual)?manual:0,source:'Manual Input',mode:'manual',code:code,date:asOf,engineVersion:null,reason:lastError?lastError.message:(config.PINE_AUTO_ENABLED?'Auto Pine unavailable':'PINE_AUTO_ENABLED=false')};
  }
  function text(id,value){var el=root.document&&root.document.getElementById(id);if(el)el.textContent=value;}
  function render(){
    var result=resolve();
    text('pine-auto-score',Number(result.score).toFixed(1));text('pine-auto-source',result.source);text('pine-auto-date',result.date||'--');
    text('pine-auto-engine',result.engineVersion||'--');text('pine-auto-mode',result.mode==='auto'?'Auto':result.mode==='override'?'Override':'Manual');
    text('pine-auto-status',loading?'正在读取 Pine API…':(result.reason||'Pine 输入已通过 Resolver'));
    var panel=root.document&&root.document.getElementById('pine-auto-panel');if(panel)panel.dataset.mode=result.mode;
    return result;
  }
  async function requestPayload(fetchImpl){
    var fetcher=fetchImpl||root.fetch;if(typeof fetcher!=='function')throw new Error('fetch unavailable');
    var controller=typeof AbortController!=='undefined'?new AbortController():null;
    var timer=setTimeout(function(){if(controller)controller.abort();},config.timeoutMs);
    try{
      var response=await fetcher(config.apiUrl,{method:'GET',cache:'no-store',headers:{Accept:'application/json'},signal:controller?controller.signal:undefined});
      if(!response.ok)throw new Error('Pine API HTTP '+response.status);
      return validatePayload(await response.json(),selectedDate());
    }catch(error){if(error&&error.name==='AbortError')throw new Error('Pine API timeout');throw error;}finally{clearTimeout(timer);}
  }
  async function refresh(options){
    options=options||{};loading=true;lastError=null;render();
    try{payload=await requestPayload(options.fetchImpl);return payload;}
    catch(error){payload=null;lastError=error;return null;}
    finally{loading=false;render();}
  }
  function setEnabled(enabled){config.PINE_AUTO_ENABLED=enabled===true;render();}
  function setPayload(value){payload=value;lastError=null;render();}
  function init(){
    if(initialized||!root.document||!root.document.getElementById('pine-auto-panel'))return;initialized=true;
    var retry=root.document.getElementById('pine-auto-retry');if(retry)retry.addEventListener('click',function(){refresh();});
    var manual=root.document.getElementById('e_tech3');if(manual)manual.addEventListener('input',render);
    var override=root.document.getElementById('pine-manual-override-enabled');if(override)override.addEventListener('change',render);
    ['btn-000922','btn-930955'].forEach(function(id){var button=root.document.getElementById(id);if(button)button.addEventListener('click',function(){setTimeout(render,0);});});
    var date=root.document.getElementById('header-date');if(date)date.addEventListener('change',render);
    render();refresh();
  }
  root.resolvePineScore=function(){return resolve();};
  return{DEFAULTS:DEFAULTS,get config(){return config;},validatePayload:validatePayload,resolve:resolve,requestPayload:requestPayload,refresh:refresh,render:render,setEnabled:setEnabled,setPayload:setPayload,init:init};
});
