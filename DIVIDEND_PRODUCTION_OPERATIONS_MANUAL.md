# Dividend Dashboard V1.2 Production Operations Manual

## Daily checks

1. Data update: verify collector success, latest source dates, row counts/quality and canonical snapshot generation. Do not publish partial or fabricated zero data.
2. Worker: call `/health`, then `/latest`; confirm HTTP 200, expected schema, index identities and freshness.
3. Pages: confirm the Pages action succeeded, production HTML loads, today autofill works, and page HTML hash matches the release manifest.
4. Pine: confirm Pine Auto reports Python Auto, engine `pine-v7-red-rocket-final`, valid date/score and no Resolver fallback. Run the Resolver/Shadow/Static gates before releases.
5. History Engine: call a recent valid trading date for each enabled index and one boundary case; confirm `Historical Calculation`, target date, cache status, and `/latest` isolation.

## Standard probes

```sh
curl -fsS https://dividend-dashboard-api.zq609256057.workers.dev/health
curl -fsS https://dividend-dashboard-api.zq609256057.workers.dev/latest
curl -fsS 'https://dividend-dashboard-api.zq609256057.workers.dev/history/calculate?code=930955&date=2026-07-14'
curl -fsS 'https://dividend-dashboard-api.zq609256057.workers.dev/archive?index=930955&date=2026-07-14'
```

## Incident handling

### API failure

Capture timestamp, endpoint, status, response body and request identity. Check Worker deployment status and `/health`; determine whether failure is route-wide or index/date-specific. Do not change scoring or browser logic as an API workaround.

### Missing data

Check registry enablement, table date coverage, source status and target-date row quality. Preserve explicit `unavailable`, `DATE_NOT_FOUND`, `DATE_UNAVAILABLE` or `INSUFFICIENT_HISTORY`; never substitute zero. Repair the source/materialization through the controlled data pipeline and revalidate both indices.

### Worker failure

Stop further deployment, preserve logs/version IDs, confirm Pages has not changed, then restore the prior Worker version if the issue is production-impacting. Re-run health/latest/archive/history/Pine and scoring checks.

### Rollback

Use `ROLLBACK_GUIDE_V1_2.md`. Roll back one layer at a time, retain history cache unless corruption is proven, and record the incident and post-rollback hashes.

## Release discipline

Never edit production HTML, Worker, scoring rules or Pine directly. All changes use a feature branch, tests, review, explicit release, action/deployment confirmation, live smoke tests and a rollback record.
