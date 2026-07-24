import {fetchDashboard} from './dashboard_api.js';
import {adaptDashboardResponse} from './dashboard_view_model.js';

export const DASHBOARD_MODES = Object.freeze([
  'LIVE_CANONICAL',
  'HISTORICAL_REPLAY',
  'MANUAL_SIMULATION',
]);

const INITIAL_STATE = Object.freeze({
  mode: 'LIVE_CANONICAL',
  index_code: '000922',
  trade_date: 'latest',
  dashboard_view_model: null,
  loading: false,
  error: null,
  source_identity: null,
});

export class DashboardAppState {
  #state = {...INITIAL_STATE};
  #listeners = new Set();

  snapshot() {
    return Object.freeze({...this.#state});
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.snapshot());
    return () => this.#listeners.delete(listener);
  }

  begin(index_code, trade_date) {
    this.#replace({
      mode: trade_date === 'latest' ? 'LIVE_CANONICAL' : 'HISTORICAL_REPLAY',
      index_code,
      trade_date,
      dashboard_view_model: null,
      loading: true,
      error: null,
      source_identity: null,
    });
  }

  succeed(viewModel) {
    this.#replace({
      mode: viewModel.mode,
      index_code: viewModel.index_code,
      trade_date: viewModel.trade_date,
      dashboard_view_model: viewModel,
      loading: false,
      error: null,
      source_identity: viewModel.source_identity,
    });
  }

  fail(code) {
    this.#replace({
      ...this.#state,
      dashboard_view_model: null,
      loading: false,
      error: code,
      source_identity: null,
    });
  }

  #replace(next) {
    this.#state = next;
    const snapshot = this.snapshot();
    this.#listeners.forEach(listener => listener(snapshot));
  }
}

export class DashboardRequestController {
  #generation = 0;
  #abortController = null;

  constructor({
    state,
    loader = fetchDashboard,
    adapter = adaptDashboardResponse,
  }) {
    this.state = state;
    this.loader = loader;
    this.adapter = adapter;
  }

  async load(index_code, trade_date = 'latest') {
    const generation = ++this.#generation;
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    this.state.begin(index_code, trade_date);
    try {
      const response = await this.loader({
        index_code,
        trade_date,
        signal: this.#abortController.signal,
      });
      const viewModel = this.adapter(response, {index_code, trade_date});
      if (generation === this.#generation) this.state.succeed(viewModel);
      return viewModel;
    } catch (error) {
      if (error?.name === 'AbortError') return null;
      if (generation === this.#generation) {
        this.state.fail(error?.code || 'CANONICAL_DASHBOARD_UNAVAILABLE');
      }
      return null;
    }
  }
}
