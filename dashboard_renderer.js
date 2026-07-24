/* V2 Dashboard Renderer — Consumer Field Completeness Fix V1.0 */
function sf(v,d=1){return v!=null?(typeof v==='number'?v.toFixed(d):v):'—'}
function pc(v){return v!=null?(v*100).toFixed(1)+'%':'—'}
function px(v){return v!=null?Math.round(v).toLocaleString():'—'}

const NAMES={did:'DID 股息率',yield_spread:'股债利差',cn10y:'10Y国债收益率',pb_percentile:'PB历史百分位',roe:'ROE',price_ma:'价格与均线',price_position_252:'252日价格位置百分位',pine:'Pine综合',rsi:'RSI',volume:'成交量'};
const STATUS={did:[[7,'偏低'],[14,'适中'],[20,'高股息']],yield_spread:[[3,'偏窄'],[6,'适中'],[16,'较宽']],cn10y:[[4,'低利率'],[7,'中等'],[10,'高利率']],pb_percentile:[[4,'极低分位·低估'],[6,'较低分位'],[8,'中位'],[10,'较高分位']],roe:[[2,'偏低'],[3,'适中'],[4,'优秀']],price_ma:[[3,'低于均线'],[5,'均线附近'],[8,'高于均线']],price_position_252:[[3,'低位'],[5,'偏低'],[7,'中位'],[7,'偏高']],pine:[[4,'偏空'],[6,'中性'],[8,'偏多'],[10,'强共振']],rsi:[[3,'超卖'],[5,'偏弱'],[7,'中性'],[8,'偏强'],[10,'超买']],volume:[[2,'缩量'],[3,'正常'],[5,'放量']]};

function statusLabel(id,score){
  const ranges=STATUS[id]; if(!ranges||score==null)return '';
  for(const [thresh,label] of ranges){if(score<=thresh)return label;}
  return ranges[ranges.length-1][1];
}

function renderApp(state){
  const vm=state.dashboard_view_model;
  if(state.loading)return '<div class="loader">⏳ 正在获取 '+state.index_code+' DashboardViewModel...</div>';
  if(state.error||!vm)return '<div class="error-card"><h3>⚠️ Dashboard 不可用</h3><p>'+(state.error||'CANONICAL_DASHBOARD_UNAVAILABLE')+'</p></div>';
  const s=vm.score||{}, m=vm.market||{}, cd=vm.cards||{}, isHist=state.mode==='HISTORICAL_REPLAY';
  const badge=isHist?'<span class="header-badge">HISTORICAL_REPLAY</span>':'<span class="header-badge auto">✅ 自动数据 · '+vm.trade_date+'</span>';
  const h=[];
  // Header + Index Selector
  h.push('<div class="card" style="border-radius:16px;margin-bottom:20px"><div class="header-bar"><div class="header-left"><h1>'+vm.index_code+' · 红利低波看板</h1><div style="display:flex;align-items:center;gap:6px;margin-top:4px"><span class="index-code">多维量化看板 ·</span><input type="date" class="date-input" id="v2-hdr-date" value="'+(vm.trade_date||'')+'"/><select id="v2-idx-sel" style="padding:4px 8px;border:1px solid #ddd6fe;border-radius:6px;font-size:12px;background:#fff"><option value="000922"'+(state.index_code==='000922'?' selected':'')+'>000922 红利低波</option><option value="930955"'+(state.index_code==='930955'?' selected':'')+'>930955 红利低波100</option></select></div></div>'+badge+'</div></div>');
  // Hero (BEFORE KPI)
  const ts=s.total_score||0; let zone='回避',zc='score-red',bg='#fee2e2',sig='谨慎观望',op='防御为主，等待更好机会';
  if(ts>=85){zone='强烈买入';zc='score-green';bg='#d1fae5';sig='强买入信号';op='积极配置，分批建仓'}
  else if(ts>=70){zone='关注';zc='score-green';bg='#d1fae5';sig='买入信号';op='分批布局，逐步加仓'}
  else if(ts>=60){zone='关注';zc='score-green';bg='#d1fae5';sig='中性偏多';op='逐步关注，适当参与'}
  else if(ts>=40){zone='观察';zc='score-amber';bg='#fef3c7';sig='中性观望';op='观察等待，控制仓位'}
  const pct=Math.min(100,Math.max(0,ts));
  h.push('<div class="score-hero"><div style="font-size:14px;font-weight:700;color:var(--muted);margin-bottom:4px">综合值博率评分</div><div class="score-big '+zc+'">'+sf(ts)+'<span style="font-size:24px">/100</span></div><div class="verdict-pill" style="background:'+bg+'"><span class="verdict-dot" style="background:var(--'+(ts>=60?'green':ts>=40?'amber':'red')+')"></span>'+zone+'区域 · '+sig+'</div><div class="scale-track"><div class="scale-fill" style="width:'+pct+'%"></div></div><div class="scale-labels"><span style="left:0">0 回避</span><span style="left:40%">40 观察</span><span style="left:60%">60 关注</span><span style="left:80%">80 买入</span><span style="left:100%">100</span></div><div style="margin-top:16px;display:flex;justify-content:center;gap:24px;font-size:13px"><span>估值 <b style="color:var(--purple)">'+sf(s.valuation_score)+'</b></span><span>技术 <b style="color:var(--green)">'+sf(s.technical_score)+'</b></span><span>趋势 <b>'+sf(s.trend_adjustment)+'</b></span></div><div style="margin-top:8px;font-size:11px;color:var(--muted)">'+op+'</div></div>');
  // KPI Grid (AFTER Hero)
  const sp=m.yield_spread?.value||0;
  h.push('<div class="kpi-grid"><div class="kpi-card"><div class="kpi-label">当前指数点位</div><div class="kpi-value">'+px(m.index_point?.value)+'</div></div><div class="kpi-card"><div class="kpi-label">DID 股息率</div><div class="kpi-value" style="color:var(--red)">'+sf(m.did?.value,2)+'%</div></div><div class="kpi-card"><div class="kpi-label">CN10Y 国债收益率</div><div class="kpi-value">'+sf(m.cn10y?.value,4)+'%</div></div><div class="kpi-card"><div class="kpi-label">股债利差</div><div class="kpi-value">'+(sp>0?'+':'')+sf(sp,2)+'%</div><div class="kpi-sub">DID − CN10Y</div></div></div>');
  // ① Quant with status
  const vrows=(vm.valuation_components||[]).map(c=>{const id=c.component_id;const st=statusLabel(id,c.score);return '<div class="score-row"><span class="score-row-label" title="'+st+'">'+NAMES[id]+'</span><div class="score-bar-wrap"><div class="score-bar-fill" style="width:'+(c.max_score?c.score/c.max_score*100:0)+'%;background:#7c3aed"></div></div><span class="score-row-pts">'+sf(c.score)+'/'+(c.max_score||'—')+' <span style="font-size:10px;color:var(--muted)">'+st+'</span></span></div>';}).join('');
  const trows=(vm.technical_components||[]).map(c=>{const id=c.component_id;const st=statusLabel(id,c.score);return '<div class="score-row"><span class="score-row-label" title="'+st+'">'+NAMES[id]+'</span><div class="score-bar-wrap"><div class="score-bar-fill" style="width:'+(c.max_score?c.score/c.max_score*100:0)+'%;background:#059669"></div></div><span class="score-row-pts">'+sf(c.score)+'/'+(c.max_score||'—')+' <span style="font-size:10px;color:var(--muted)">'+st+'</span></span></div>';}).join('');
  h.push('<div class="card"><div class="card-title">①量化分解</div><div class="dim-label">估值面</div>'+vrows+'<div class="subtotal-row"><span>估值小计</span><span style="color:var(--purple)">'+sf(s.valuation_score)+'/60</span></div><div class="dim-label">技术面</div>'+trows+'<div class="subtotal-row"><span>技术小计</span><span style="color:var(--green)">'+sf(s.technical_score)+'/40</span></div></div>');
  // ② Price MA
  const ma=cd.price_ma||{};
  const maRows=[['SMA60',ma.sma60],['SMA120',ma.sma120],['SMA250',ma.sma250]].filter(([,v])=>v!=null).map(([n,v])=>{const pt=ma.point;const dev=pt&&v?(pt-v)/v*100:null;const tag=dev!=null?(dev>0?'<span class="tag-above">+':dev<0?'<span class="tag-below">':'')+sf(dev)+'%'+(dev!==0?'</span>':''):'—';return '<tr><td>'+n+'</td><td>'+sf(v)+'</td><td>'+tag+'</td></tr>';}).join('');
  h.push('<div class="card"><div class="card-title">②价格与均线结构</div>'+(maRows?'<table class="ma-table"><tr><th>均线</th><th>价格</th><th>偏离</th></tr>'+maRows+'</table>':'<p style="font-size:11px;color:var(--muted)">数据暂不可用</p>')+'<div style="font-size:10px;color:var(--muted);margin-top:6px">当前价格: '+sf(ma.point)+'</div></div>');
  // ③ 252 Position
  const pp=cd.price_position_252||{}; const ppPct=pp.value!=null?pp.value*100:0;
  h.push('<div class="card"><div class="card-title">③252日价格位置百分位</div><div class="gauge-track"><div class="gauge-ptr" style="left:'+Math.min(100,Math.max(0,ppPct))+'%"></div></div><div class="gauge-labels"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div><div class="pp252-row"><span>当前价格</span><span class="pp252-value">'+sf(pp.value)+'</span></div><div class="pp252-row"><span>252日最高</span><span class="pp252-value">'+sf(pp.high)+'</span></div><div class="pp252-row"><span>252日最低</span><span class="pp252-value">'+sf(pp.low)+'</span></div></div>');
  // ④ Valuation
  const vd=cd.valuation_dashboard||{}; const vdPct=vd.pb!=null?Math.min(100,Math.max(0,(vd.pb||0)*10)):50;
  h.push('<div class="card"><div class="card-title">④估值仪表盘</div><div class="gauge-track"><div class="gauge-ptr" style="left:'+vdPct+'%"></div></div><div class="gauge-labels"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div><div class="pp252-row"><span>DID</span><span class="pp252-value">'+sf(vd.did,2)+'%</span></div><div class="pp252-row"><span>PB</span><span class="pp252-value">'+sf(vd.pb)+'</span></div><div class="pp252-row"><span>PE(TTM)</span><span class="pp252-value">'+sf(vd.pe)+'</span></div><div class="pp252-row"><span>ROE</span><span class="pp252-value">'+sf(vd.roe)+'%</span></div></div>');
  // ⑤ Momentum
  const mm=cd.momentum||{}; const rsiV=mm.rsi||50;
  h.push('<div class="card"><div class="card-title">⑤动能指标</div><div class="gauge-track"><div class="gauge-ptr" style="left:'+Math.min(100,Math.max(0,(rsiV-0)/100*100))+'%"></div></div><div class="gauge-labels"><span>0 超卖</span><span>30</span><span>50</span><span>70 超买</span><span>100</span></div><div class="pp252-row"><span>RSI(14)</span><span class="pp252-value">'+sf(rsiV)+'</span></div><div class="pp252-row"><span>成交量状态</span><span class="pp252-value">'+sf(mm.volume)+'</span></div></div>');
  // ⑥ Market Environment
  const me=cd.market_environment||{};
  const cn10=me.cn10y?.value??me.cn10y; const ys=me.yield_spread?.value??me.yield_spread;
  const cn10Judgment=cn10!=null?(cn10<2?'低利率环境，红利吸引力增强':cn10<3?'利率适中':cn10>4?'高利率环境，债券替代效应明显':'利率偏高'):'—';
  const ysJudgment=ys!=null?(ys>3?'利差较宽，红利资产显著占优':ys>1.5?'利差适中，红利有相对优势':ys>0?'利差偏窄':'利差为负，债券相对占优'):'—';
  h.push('<div class="card"><div class="card-title">⑥市场环境</div><div style="display:flex;gap:10px;margin-bottom:10px"><div class="spread-box" style="flex:1"><div class="spread-box-label">10Y国债</div><div class="spread-box-val">'+sf(cn10,4)+'%</div></div><div class="spread-box" style="flex:1"><div class="spread-box-label">股债利差</div><div class="spread-box-val">'+(ys!=null?(ys>0?'+':'')+sf(ys,2)+'%':'—')+'</div></div></div><div class="warn-box">🏦 '+cn10Judgment+'</div><div class="warn-box" style="margin-top:6px">📊 '+ysJudgment+'</div></div>');
  // ⑦ Comprehensive Judgment
  const cj=cd.comprehensive_judgment||{}; const src=cj.source||{};
  const bullish=src.bullish_factors||[]; const bearish=src.bearish_factors||[];
  const trends=vm.trend||{}; const trendAdj=s.trend_adjustment||0;
  let trendReason='窗口不足，趋势中性';
  if(trendAdj>0)trendReason='近期动量向上，趋势改善';
  else if(trendAdj<0)trendReason='近期动量向下，趋势承压';
  h.push('<div class="card"><div class="card-title">⑦综合研判</div><div class="analyst-block"><h4>📋 趋势动量</h4><p style="font-size:11px">调整值：'+(trendAdj>0?'+':'')+sf(trendAdj)+' · '+trendReason+'</p></div>'+(bullish.length?'<div class="analyst-block" style="margin-top:8px"><h4>✅ 利多因素</h4>'+bullish.map(b=>'<div class="analyst-item"><span class="analyst-dot green"></span><p>'+b+'</p></div>').join('')+'</div>':'')+(bearish.length?'<div class="analyst-block" style="margin-top:8px"><h4>⚠️ 利空因素</h4>'+bearish.map(b=>'<div class="analyst-item"><span class="analyst-dot red"></span><p>'+b+'</p></div>').join('')+'</div>':'')+'</div>');
  // ⑧ Scoring Signals (old format)
  const ranges=[{range:'85-100',sig:'强烈买入',op:'积极配置',cls:'bg-green'},{range:'70-85',sig:'强买入',op:'分批布局',cls:'bg-green'},{range:'60-70',sig:'中性偏多',op:'逐步关注',cls:'bg-green'},{range:'40-60',sig:'中性观望',op:'观察等待',cls:'bg-amber'},{range:'0-40',sig:'回避',op:'防御为主',cls:'bg-red'}];
  const sigRows=ranges.map(r=>'<tr class="'+(ts>=parseInt(r.range.split('-')[0])&&ts<=parseInt(r.range.split('-')[1])?r.cls:'')+'"><td>'+r.range+'</td><td>'+r.sig+'</td><td>'+r.op+'</td></tr>').join('');
  h.push('<div class="card"><div class="card-title">⑧评分信号参考</div><table class="ma-table"><tr><th>分数区间</th><th>信号</th><th>操作参考</th></tr>'+sigRows+'</table></div>');
  // History rows
  if(state.historyRows&&state.historyRows.length){
    h.push('<div class="card"><div class="card-title">📜 历史评分记录</div>'+state.historyRows.map(r=>'<div class="pp252-row" style="cursor:pointer" onclick="window._v2Replay(\''+r.trade_date+'\')"><span>'+(r.mode==='HISTORICAL_REPLAY'?'📸':'📅')+' '+r.trade_date+'</span><span class="pp252-value">'+sf(r.total_score)+'</span></div>').join('')+'</div>');
  }
  return '<div id="app">'+h.join('')+'</div>';
}

// For module compatibility
export { renderApp };
