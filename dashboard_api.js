const DASHBOARD_ROUTE = '/api/v1/canonical/dashboard';

export class DashboardApiError extends Error {
  constructor(code, status = 0, detail = '') {
    super(detail || code);
    this.name = 'DashboardApiError';
    this.code = code;
    this.status = status;
  }
}

export async function fetchDashboard({
  index_code,
  trade_date = 'latest',
  signal,
  fetchImpl = globalThis.fetch,
  baseUrl = '',
}) {
  const query = new URLSearchParams({index_code, trade_date});
  let response;
  try {
    response = await fetchImpl(`${baseUrl}${DASHBOARD_ROUTE}?${query}`, {
      method: 'GET',
      headers: {Accept: 'application/json'},
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new DashboardApiError('CANONICAL_DASHBOARD_UNAVAILABLE', 0);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new DashboardApiError('DASHBOARD_CONTRACT_INCOMPLETE', response.status);
  }

  if (!response.ok) {
    throw new DashboardApiError(
      payload?.error || 'CANONICAL_DASHBOARD_UNAVAILABLE',
      response.status,
    );
  }
  if (
    payload?.status !== 'complete'
    || payload?.contract_version !== 'canonical_dashboard_read_v1'
    || payload?.verified_only !== true
    || !payload?.dashboard
  ) {
    throw new DashboardApiError('DASHBOARD_CONTRACT_INCOMPLETE', response.status);
  }
  return payload;
}
