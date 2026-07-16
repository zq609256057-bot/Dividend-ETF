# V1.3 Production Worker Final Deploy Report

Date: 2026-07-16

## Deployment identity

- Worker: `dividend-dashboard-api`
- Version ID: `249eb3fa-cd10-4993-bd1e-2f090c9e5aa9`
- Version created: `2026-07-16T11:14:44.345Z`
- Deployment created: `2026-07-16T11:14:46.978Z`
- Traffic: 100%
- Message: `V1.3 production cutover after historical identity revalidation`
- Accepted Candidate version: `bf54abd0-8159-4e49-9cd9-62f28269038f`

## Artifact identity

- Worker source SHA-256: `d852531aed2c694133136dc5dbf8e5ed873a128934d74e34c91cbdcfdcdc8d41`
- Wrangler dry-run bundle (`worker.js`) SHA-256: `cf61ca345ad8460e77e3c26acfc07815d672fa31c21f1e61a37c6d5c87d369be`
- Candidate HTML SHA-256: `d27602ec7f98a2fbe799765d47f5a76adeae3b1e88d13eefc33c76441653fdce`
- Index Manager SHA-256: `371f353fd9475f14c6e3c5bd2dfa6579b92e26ff983f96eb2ef2e5dadecf0110`
- Historical identity adapter SHA-256: `d40c285cc8efbb5de420414e017c555bbea96a88c1154b7e01ba57a62e735721`

The temporary config used the exact Production Worker name, `DEPLOYMENT_ENVIRONMENT=production`, workers.dev endpoint, existing KV binding and accepted Candidate assets. It contained no custom route, Cron, Shadow/service binding, temporary binding or plaintext Secret. `SNAPSHOT_ADMIN_TOKEN` remained an existing remote Secret reference; its value was never read or printed.

## Runtime identity response

`GET /health` returned HTTP 200 with:

- service: `dividend-index-management-production`
- `production=true`
- `releaseCandidate=false`
- `environment=production`
- `kvWrites=0`

## Immediate read-only API acceptance

All live checks passed before any Pages publication:

- `/indices`: Registry v2; enabled codes exactly `000922` and `930955`; history/latest availability true.
- `/latest`: both identities correct; prices `5307.5` and `11122.67`.
- Pine: top-level `shadowOnly=true`; both scores `3`, date `2026-07-14`, engine `pine-v7-red-rocket-final`.
- History normal date: both codes returned HTTP 200, requested identity, date `2026-07-10`, source `historical_calculation`.
- Weekend: HTTP 422 `DATE_UNAVAILABLE`.
- Missing date: HTTP 404 `DATE_NOT_FOUND`.
- Unsupported `999999`: HTTP 400 `UNSUPPORTED_CODE`.
- `/archive`: PASS.
- `/dividend-data`: both identities PASS.
- `INSUFFICIENT_HISTORY`: deterministic Worker integration gate PASS. It was not induced against live Production because both enabled Registry indices are history-ready and the release forbids Registry/KV mutation.

Only GET requests were sent. No snapshot refresh or `/admin/snapshot` request was made.

## Protection counters at API acceptance

- Production Worker forward deploys: 1
- Production KV payload writes: 0
- Snapshot refreshes: 0
- KV deletes: 0
- Route changes: 0
- Secret changes: 0
- GitHub Pages publishes: 0

## Final online acceptance and rollback

Pages was published through release PR `#1` after the Worker API gate passed. Final browser acceptance found a historical-switch UI state race: data identity remained correct, but the backfill button label stayed permanently at `⏳ 计算中...` after the stale request was discarded.

The Worker was therefore rolled back:

- Restored version: `7221bebb-719e-4265-8dde-ee5632d3a839`
- Rollback deployment: `2026-07-16T11:26:21.302Z`
- Traffic: 100% baseline
- Post-rollback health: HTTP 200, legacy schema `dividend_indices_snapshot_v1`, date `2026-07-14`, codes `000922` and `930955`.

The forward deployment and rollback performed no KV payload writes, KV deletes or snapshot refreshes. The Candidate version remains isolated for a future loading-state repair and revalidation.
