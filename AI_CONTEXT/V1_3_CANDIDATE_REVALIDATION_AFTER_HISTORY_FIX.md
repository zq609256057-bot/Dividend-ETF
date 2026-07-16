# V1.3 Candidate Revalidation After History Identity Fix

Date: 2026-07-16

## Candidate deployment

- Worker: `dividend-dashboard-api-v1-3-production-candidate`
- Version: `bf54abd0-8159-4e49-9cd9-62f28269038f`
- Created: `2026-07-16T08:43:53.516Z`
- Deployed: `2026-07-16T08:43:56.229Z`
- Candidate URL: <https://dividend-dashboard-api-v1-3-production-candidate.zq609256057.workers.dev/>
- Runtime identity: `production=false`, `releaseCandidate=true`, `environment=candidate`, `kvWrites=0`

## Read-only API acceptance

| Endpoint | Result |
|---|---|
| `/health` | HTTP 200; Candidate identity correct; `kvWrites=0` |
| `/indices` | Registry v2; exactly `000922`, `930955` |
| `/latest` | `000922=5307.5`, `930955=11122.67`; identities correct |
| `/api/shadow/pine/latest` | both score 3; engine `pine-v7-red-rocket-final`; `shadowOnly=true` |
| `/history/calculate` normal | both codes HTTP 200; `historical_calculation`; `kv_materialized_read_only` |
| Weekend | HTTP 422 `DATE_UNAVAILABLE` |
| Missing date | HTTP 404 `DATE_NOT_FOUND` |
| Unsupported `999999` | HTTP 400 `UNSUPPORTED_CODE` |

Only GET requests were used. `/admin/snapshot` was not called.

## Browser acceptance

Desktop and 390×844 mobile passed:

- dynamic Registry selection and both index identities;
- normal history for both indices;
- delayed historical-response switch and rapid three-way switch;
- no previous-index price, DID, score or Pine context survived;
- Python Auto/Pine engine and Manual Override priority;
- current-index failure retention;
- mobile `scrollWidth=390` with no horizontal overflow;
- Console blocking errors: 0.

## Production protection

- Production Worker active version: `7221bebb-719e-4265-8dde-ee5632d3a839` (unchanged)
- Production Worker deployments: 0
- Production KV writes/deletes: 0/0
- Snapshot refreshes: 0
- GitHub Pages publishes: 0
- Production Pages/root HTML SHA-256: `aba90da354c1c6de15e0c95c92c7cecf9a59f769c66a7b3299835bd71db24a97` (unchanged)
- Pine Engine, Resolver, scoring, valuation, macro and Registry changes: 0

## Conclusion

The historical query identity blocker that caused the previous Production rollback is closed in the isolated Candidate. This report authorizes no Production cutover or Pages publication; those remain separate tasks.

**V1_3_CANDIDATE_REVALIDATED**
