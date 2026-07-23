(function(root){
"use strict";
var CONFIG=root.CANONICAL_SCORE_CONSUMER_CONFIG||{};
var MODE=CONFIG.readMode||"canonical";
var API=String(CONFIG.apiBase||(root.location&&root.location.origin)||"").replace(/\/$/,"");
var RULE=CONFIG.ruleVersion||"V1.0";
var CONTRACT="canonical_consumer_read_v1";
var AUTHORITY="POINT_IN_TIME_VERIFIED";
var CANONICAL_ENDPOINTS=Object.freeze({latest:"/api/v1/canonical/latest",history:"/api/v1/canonical/history",health:"/api/v1/canonical/health"});
var verifiedManifestDigest=null;
function levelFor(score){return score>=85?"极强买入":score>=70?"强买入":score>=60?"中性偏多":score>=45?"中性观望":score>=30?"偏贵信号":"高估警示"}
function colorFor(score){return score>=70?"#059669":score>=60?"#d97706":"#dc2626"}
function backgroundFor(score){return score>=70?"#d1fae5":score>=60?"#fef3c7":"#fee2e2"}
function textColorFor(score){return score>=70?"#065f46":score>=60?"#92400e":"#991b1b"}
function number(value){return root.formatDisplayNumber?root.formatDisplayNumber(value):String(value)}
function el(id){return root.document&&root.document.getElementById(id)}
function hex64(value){return typeof value==="string"&&/^[0-9a-f]{64}$/.test(value)}
function fail(reason){throw new Error(reason)}
async function request(path){var response=await root.fetch(API+path,{cache:"no-store",headers:{Accept:"application/json"}}),body;try{body=await response.json()}catch(error){fail("CANONICAL_INVALID_JSON")}if(!response.ok)fail(body&&body.error||body&&body.status||("HTTP "+response.status));return body}
function assertEnvelope(body,label){if(!body||body.status!=="complete"||body.contract_version!==CONTRACT||body.verified_only!==true||body.browser_recalculation!==false||body.research_substitution!==false||!hex64(body.manifest_digest))fail(label+"_ENVELOPE_INVALID");if(verifiedManifestDigest&&body.manifest_digest!==verifiedManifestDigest)fail(label+"_MANIFEST_DIGEST_MISMATCH");return body}
function assertScore(score,code,date){if(!score||score.schema_version!=="score-result-v1"||score.index_code!==code||score.trade_date!==date||score.rule_version!==RULE||score.data_authority_class!==AUTHORITY||score.point_in_time_verified!==true||typeof score.engine_version!=="string"||!score.engine_version||!hex64(score.result_digest)||!hex64(score.snapshot_digest))fail("CANONICAL_SCORE_IDENTITY_INVALID");["valuation_score","technical_score","base_score","trend_bonus","final_score"].forEach(function(field){if(!Number.isFinite(Number(score[field])))fail("CANONICAL_SCORE_VALUE_INVALID")});return score}
function assertHistoryPoint(score,code){if(!score||typeof score.trade_date!=="string")fail("CANONICAL_HISTORY_IDENTITY_INVALID");return assertScore(score,code,score.trade_date)}
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
function rollbackToLegacy(){MODE="legacy";root.__canonicalConsumerRollback={active:true,mode:"legacy",reason:"consumer_read_path_rollback"};return root.calcScore({manualSimulation:true,legacyRollbackRender:true})}
function restoreCanonical(){MODE="canonical";root.__canonicalConsumerRollback={active:false,mode:"canonical"};return refreshCurrent()}
function historyRecord(point){return{date:point.trade_date,code:point.index_code,total:Number(point.final_score),valTotal:Number(point.valuation_score),techTotal:Number(point.technical_score),level:levelFor(Number(point.final_score)),price:null,_canonical:true,result_digest:point.result_digest,score_result:point}}
async function loadHealth(){var body=await request(CANONICAL_ENDPOINTS.health);if(!body||body.status!=="ok"||body.contract_version!==CONTRACT||body.verified_only!==true||body.browser_recalculation!==false||body.research_substitution!==false||!hex64(body.manifest_digest))fail("CANONICAL_HEALTH_INVALID");verifiedManifestDigest=body.manifest_digest;return body}
async function loadLatest(code,date){var params=new URLSearchParams({index_code:code}),body=assertEnvelope(await request(CANONICAL_ENDPOINTS.latest+"?"+params),"CANONICAL_LATEST"),scores=Array.isArray(body.scores)?body.scores:[];if(scores.length!==1)fail("CANONICAL_LATEST_CARDINALITY_INVALID");return renderScore(assertScore(scores[0],code,date))}
async function loadHistory(code,endDate,startDate){var params=new URLSearchParams({index_code:code,start_date:startDate||"1900-01-01",end_date:endDate||"2999-12-31",limit:"20000"}),body=assertEnvelope(await request(CANONICAL_ENDPOINTS.history+"?"+params),"CANONICAL_HISTORY"),points=Array.isArray(body.points)?body.points:null;if(!points||body.index_code!==code)fail("CANONICAL_HISTORY_CONTRACT_INVALID");var records=points.map(function(point){return historyRecord(assertHistoryPoint(point,code))});root._etfHistory=records;if(typeof root.renderHistory==="function")root.renderHistory(records);return body}
async function loadExact(code,date){var params=new URLSearchParams({index_code:code,start_date:date,end_date:date,limit:"1"}),body=assertEnvelope(await request(CANONICAL_ENDPOINTS.history+"?"+params),"CANONICAL_HISTORY_EXACT"),points=Array.isArray(body.points)?body.points:[];if(body.index_code!==code||points.length!==1)return renderUnavailable(code,date);return renderScore(assertScore(points[0],code,date))}
async function refreshCurrent(){if(MODE==="legacy")return root.calcScore({manualSimulation:true,legacyRollbackRender:true});var code=String(root._selIndex||""),date=el("header-date")&&el("header-date").value;if(!code||!date)return renderUnavailable(code,date);try{await loadHealth();var result=await loadLatest(code,date);await loadHistory(code,date);return result}catch(error){return renderUnavailable(code,date)}}
function install(){var date=el("header-date");if(date)date.addEventListener("change",refreshCurrent);root.setTimeout(refreshCurrent,0)}
root.DividendCanonicalConsumer=Object.freeze({get mode(){return MODE},api:API,ruleVersion:RULE,endpoints:CANONICAL_ENDPOINTS,request:request,loadHealth:loadHealth,loadLatest:loadLatest,loadExact:loadExact,loadHistory:loadHistory,refreshCurrent:refreshCurrent,renderScore:renderScore,renderUnavailable:renderUnavailable,rollbackToLegacy:rollbackToLegacy,restoreCanonical:restoreCanonical,install:install});if(root.document)install();
})(typeof window!=="undefined"?window:globalThis);
