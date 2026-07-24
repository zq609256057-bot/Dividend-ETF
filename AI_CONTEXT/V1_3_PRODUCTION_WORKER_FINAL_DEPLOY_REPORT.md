# V1.3 Production Worker Final Deploy Report

Date: 2026-07-16

## Deployment identity

- Worker: `dividend-dashboard-api`
- Version ID: `345f3aad-3ca7-4811-a212-6cadbfb441c6`
- Version created: `2026-07-16T12:32:49.305Z`
- Deployment created: `2026-07-16T12:32:52.803Z`
- Traffic: 100%
- Message: `V1.3-production-cutover-after-loading-ownership-fix`
- Accepted Candidate version: `9d1bbef2-f26f-4467-96ba-8abb3b1af881`
- Saved rollback version: `7221bebb-719e-4265-8dde-ee5632d3a839`

## Artifact identity

- Worker source SHA-256: `d852531aed2c694133136dc5dbf8e5ed873a128934d74e34c91cbdcfdcdc8d41`
- Wrangler dry-run bundle SHA-256: `cf61ca345ad8460e77e3c26acfc07815d672fa31c21f1e61a37c6d5c87d369be`
- Temporary Production config SHA-256: `672d6c0b94aa7d95db37bb36977dd4752d567a756a816f9b0a2998c3fad321ff`
- Candidate HTML SHA-256: `d27602ec7f98a2fbe799765d47f5a76adeae3b1e88d13eefc33c76441653fdce`
- Candidate Historical Adapter SHA-256: `9a74593f4871d3694315c56e600a7addad80a35e5747d0ea9aa8e68a503048a6`
- Production Pages Historical Adapter SHA-256: `f19b360cd281c1cecdd23008546a1bc0ede779dbbadce8dd48de54a4ea6ac935`

The mode-0600 temporary config used the exact Production Worker name, `DEPLOYMENT_ENVIRONMENT=production`, workers.dev endpoint, accepted Candidate source/assets and existing Production KV binding. It contained no Candidate Worker name, custom route, Cron, Shadow/service binding, temporary binding or plaintext Secret. Namespace ID and Secret value were not reported or written to Git.

## Runtime identity

`GET /health` returned HTTP 200:

- `production=true`
- `releaseCandidate=false`
- `environment=production`
- `kvWrites=0`

## Immediate GET-only API acceptance

| Gate | Result |
|---|---|
| `/indices` Registry v2, exactly `000922`, `930955` | PASS |
| `/latest` identity and prices `5307.5`, `11122.67` | PASS |
| Pine score `3`, engine `pine-v7-red-rocket-final`, `shadowOnly=true` | PASS |
| History normal date for both indices | PASS |
| Weekend `DATE_UNAVAILABLE` | PASS |
| Missing date `DATE_NOT_FOUND` | PASS |
| Unsupported `999999` | PASS |
| `/archive` for both indices | PASS |
| `/dividend-data` for both indices | PASS |
| `INSUFFICIENT_HISTORY` deterministic Worker integration branch | PASS |

`INSUFFICIENT_HISTORY` was not induced against live Production because both enabled indices are history-ready and the cutover prohibits Registry/KV mutation.

## Protection counters before Pages publication

- Production Worker deploys: `1`
- Production KV payload writes/deletes: `0/0`
- Snapshot refreshes: `0`
- Route changes: `0`
- Secret changes: `0`
- GitHub Pages publishes: `0`

No `PUT /admin/snapshot` request was sent.

## Final release confirmation

- Remote `main`: `88d3885a451da67208256a1110129242f993bc40`
- Release PR: `#3`
- Production HTML SHA-256: `fe4916d10faa32d26db9026bf70886032ba3fdeb4793b40c5864afc428f15bc8`
- Production Historical Adapter SHA-256: `f19b360cd281c1cecdd23008546a1bc0ede779dbbadce8dd48de54a4ea6ac935`
- Final Worker deployment query: version `345f3aad-3ca7-4811-a212-6cadbfb441c6` remains at 100% traffic.
- Desktop and 390×844 browser acceptance: PASS; Console errors `0/0`.
- Final rollback status: NOT REQUIRED.
