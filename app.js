import {DashboardAppState, DashboardRequestController} from './app_state.js?v=pine-v2-dashboard-visual-polish-v1';
import {
  adaptHistoricalDashboardResponse,
  fetchHistoricalDashboard,
} from './dashboard_api.js?v=pine-v2-dashboard-visual-polish-v1';
import {renderApp} from './dashboard_renderer.js?v=pine-v2-dashboard-visual-polish-v1';

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
let currentDate = 'latest';

function render(){ root.innerHTML = renderApp(state.snapshot()); }
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
