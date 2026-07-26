import {DashboardAppState, DashboardRequestController} from './app_state.js?v=pine-v2-pages-v1';
import {
  adaptHistoricalDashboardResponse,
  fetchHistoricalDashboard,
} from './dashboard_api.js?v=pine-v2-pages-v1';
import {renderApp} from './dashboard_renderer.js?v=pine-v2-pages-v1';

const BASE_URL = 'https://dividend-dashboard-api.zq609256057.workers.dev';
const state = new DashboardAppState();
let currentViewMode = 'v2_unified';
const controller = new DashboardRequestController({
  state,
  loader: request => fetchHistoricalDashboard({
    ...request,
    view_mode: currentViewMode,
    baseUrl: BASE_URL,
  }),
  adapter: (response, expected) => adaptHistoricalDashboardResponse(response, {
    ...expected,
    view_mode: currentViewMode,
  }),
});
const root = document.querySelector('#root');
const INDICES = ['000922','930955'];
let currentDate = 'latest';

function viewModeToolbar(){
  const vm=state.snapshot().dashboard_view_model;
  const identity=vm
    ? `${vm.score_profile_version||'—'} · ${vm.pine_rule_version||'—'} · ${vm.timeframe_identity||'—'} · ${vm.point_in_time_verified?'Point-in-time Verified':'非当时点验证'}`
    : 'Pine V2 Governed Production Archive';
  return `<div class="card" data-v2-view-toolbar="true" style="margin-bottom:12px;border:1px solid #ddd6fe">
    <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
      <label style="font-size:12px;font-weight:800">历史评分口径
        <select id="v2-view-mode" style="margin-left:8px;padding:5px 8px;border:1px solid #ddd6fe;border-radius:6px">
          <option value="v2_unified"${currentViewMode==='v2_unified'?' selected':''}>V2 统一计算（默认）</option>
          <option value="original_replay"${currentViewMode==='original_replay'?' selected':''}>原始 Verified 回放</option>
          <option value="v1_comparison"${currentViewMode==='v1_comparison'?' selected':''}>V1 对照</option>
        </select>
      </label>
      <span style="font-size:11px;color:var(--muted)" data-v2-identity>${identity}</span>
    </div>
  </div>`;
}
function render(){ root.innerHTML = viewModeToolbar()+renderApp(state.snapshot()); }
state.subscribe(() => { render(); bindEvents(); });

function bindEvents(){
  const sel = document.querySelector('#v2-idx-sel');
  const dateInput = document.querySelector('#v2-hdr-date');
  const modeSelect = document.querySelector('#v2-view-mode');
  if(modeSelect) modeSelect.addEventListener('change', () => {
    currentViewMode = modeSelect.value;
    controller.load(state.snapshot().index_code, currentDate);
  });
  if(sel) sel.addEventListener('change', () => {
    controller.load(sel.value, currentDate);
  });
  if(dateInput){
    dateInput.addEventListener('change', () => {
      currentDate = dateInput.value;
      controller.load(state.snapshot().index_code, dateInput.value);
    });
  }
}

window._v2Replay = function(date){
  currentDate = date;
  controller.load(state.snapshot().index_code, date);
};

window.__pineV2Pages = Object.freeze({
  state,
  controller,
  load(indexCode, tradeDate, viewMode = currentViewMode) {
    currentViewMode = viewMode;
    currentDate = tradeDate;
    return controller.load(indexCode, tradeDate);
  },
});

controller.load('000922', currentDate);
