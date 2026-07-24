import {DashboardAppState, DashboardRequestController} from './app_state.js';
import {renderApp} from './dashboard_renderer.js';

const BASE_URL = 'https://canonical-v1-dividend-dashboard-api-canonical-candidate-v1.zq609256057.workers.dev';
const state = new DashboardAppState();
const controller = new DashboardRequestController({state});
const root = document.querySelector('#root');
const INDICES = ['000922','930955'];
let currentDate = 'latest';

function render(){ root.innerHTML = renderApp(state.snapshot()); }
state.subscribe(() => { render(); bindEvents(); });

function bindEvents(){
  const sel = document.querySelector('#v2-idx-sel');
  const dateInput = document.querySelector('#v2-hdr-date');
  if(sel) sel.addEventListener('change', () => controller.load(sel.value, 'latest'));
  if(dateInput){
    dateInput.addEventListener('change', () => {
      currentDate = dateInput.value;
      controller.load(state.snapshot().index_code, dateInput.value);
    });
  }
}

window._v2Replay = function(date){
  controller.load(state.snapshot().index_code, date);
};

controller.load('000922', 'latest');
