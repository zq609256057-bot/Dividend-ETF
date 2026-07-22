(function(root){
"use strict";
var CONFIG=root.CANONICAL_SCORE_CONSUMER_CONFIG||{};
var MODE=CONFIG.readMode||"canonical";
var API=String(CONFIG.apiBase||(root.location&&root.location.origin)||"").replace(/\/$/,"");
var RULE=CONFIG.ruleVersion||"V1.0";
function levelFor(score){return score>=85?"极强买入":score>=70?"强买入":score>=60?"中性偏多":score>=45?"中性观望":score>=30?"偏贵信号":"高估警示"}
function colorFor(score){return score>=70?"#059669":score>=60?"#d97706":"#dc2626"}
function backgroundFor(score){return score>=70?"#d1fae5":score>=60?"#fef3c7":"#fee2e2"}
function textColorFor(score){return score>=70?"#065f46":score>=60?"#92400e":"#991b1b"}
function number(value){return root.formatDisplayNumber?root.formatDisplayNumber(value):String(value)}
function el(id){return root.document&&root.document.getElementById(id)}
async function request(path){var response=await root.fetch(API+path,{cache:"no-store",headers:{Accept:"application/json"}});var body=await response.json();if(!response.ok)throw new Error(body.status||("HTTP "+response.status));return body}
function renderUnavailable(code,date){
  var score=el("hero-score"),bar=el("hero-bar"),pill=el("hero-pill"),badge=el("header-badge"),total=el("total-display");
  if(score){score.textContent="--";score.style.color="#6b7280"}if(bar)bar.style.width="0%";if(total)total.textContent="-- / 100";
  if(pill){pill.style.background="#f3f4f6";pill.style.color="#4b5563";pill.textContent="verified_unavailable · 未执行浏览器重算"}
  if(badge){badge.style.background="#f3f4f6";badge.style.color="#4b5563";badge.textContent="Canonical 暂不可用"}
  root.__canonicalConsumerState={status:"verified_unavailable",index_code:code,trade_date:date,browser_recalculation:false,research_substitution:false};return root.__canonicalConsumerState
}
function observeLegacy(score){var rows=Array.isArray(root.__legacyConsumerHistory)?root.__legacyConsumerHistory:[];var legacy=rows.find(function(item){return item&&item.code===score.index_code&&item.date===score.trade_date});root.__canonicalDualRead={enabled:true,canonical_authoritative:true,fallback_used:false,legacy_available:!!legacy,final_score_delta:legacy&&Number.isFinite(Number(legacy.total))?Number(score.final_score)-Number(legacy.total):null}}
function renderScore(score){
  var finalScore=Number(score.final_score),level=levelFor(finalScore),bg=backgroundFor(finalScore),txt=textColorFor(finalScore);
  var hero=el("hero-score"),bar=el("hero-bar"),pill=el("hero-pill"),badge=el("header-badge"),total=el("total-display"),valuation=el("subtotal-val"),technical=el("subtotal-tech");
  if(hero){hero.textContent=number(finalScore);hero.style.color=colorFor(finalScore)}if(bar)bar.style.width=Math.min(100,Math.max(0,finalScore))+"%";
  if(total){total.textContent=number(finalScore)+" / 100";total.style.color=colorFor(finalScore)}if(valuation)valuation.textContent=number(score.valuation_score)+" / 60";if(technical)technical.textContent=number(score.technical_score)+" / 40";
  if(badge){badge.textContent=level;badge.style.background=bg;badge.style.color=txt}if(pill){pill.style.background=bg;pill.style.color=txt;pill.textContent=level+" · "+number(finalScore)+"分 · Canonical"}
  root.__canonicalConsumerState={status:"complete",score_result:score,authoritative_source:"canonical_verified_score_result"};observeLegacy(score);return root.__canonicalConsumerState
}
function rollbackToLegacy(){MODE="legacy";root.__canonicalConsumerRollback={active:true,mode:"legacy",reason:"consumer_read_path_rollback"};return root.calcScore({manualSimulation:true,legacyRollbackRender:true});}
function restoreCanonical(){MODE="canonical";root.__canonicalConsumerRollback={active:false,mode:"canonical"};return refreshCurrent();}
function historyRecord(point){return{date:point.trade_date,code:point.index_code,total:Number(point.final_score),valTotal:Number(point.valuation_score),techTotal:Number(point.technical_score),level:levelFor(Number(point.final_score)),price:null,_canonical:true,result_digest:point.result_digest,score_result:point}}
async function loadHistory(code,endDate){var params=new URLSearchParams({index_code:code,start_date:"1900-01-01",end_date:endDate||"2999-12-31",rule_version:RULE,limit:"20000"});var body=await request("/api/v1/canonical/scores/history?"+params);var records=(body.points||[]).map(historyRecord);root._etfHistory=records;if(typeof root.renderHistory==="function")root.renderHistory(records);return body}
async function loadExact(code,date){var params=new URLSearchParams({index_code:code,trade_date:date,rule_version:RULE});var body=await request("/api/v1/canonical/score?"+params);if(body.status!=="complete"||!body.score_result)return renderUnavailable(code,date);return renderScore(body.score_result)}
async function refreshCurrent(){if(MODE==="legacy")return root.calcScore({manualSimulation:true,legacyRollbackRender:true});var code=String(root._selIndex||""),date=el("header-date")&&el("header-date").value;if(!code||!date)return renderUnavailable(code,date);try{var result=await loadExact(code,date);await loadHistory(code,date);return result}catch(error){return renderUnavailable(code,date)}}
function install(){var date=el("header-date");if(date)date.addEventListener("change",refreshCurrent);root.setTimeout(refreshCurrent,0)}
root.DividendCanonicalConsumer=Object.freeze({get mode(){return MODE},api:API,ruleVersion:RULE,request:request,loadExact:loadExact,loadHistory:loadHistory,refreshCurrent:refreshCurrent,renderScore:renderScore,renderUnavailable:renderUnavailable,rollbackToLegacy:rollbackToLegacy,restoreCanonical:restoreCanonical,install:install});if(root.document)install();
})(typeof window!=="undefined"?window:globalThis);
