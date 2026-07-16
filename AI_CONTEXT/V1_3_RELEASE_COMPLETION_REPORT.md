# V1.3 Release Completion Report

Date: 2026-07-16

## Final status

**V1_3_PRODUCTION_RELEASE_ROLLED_BACK**

The formal Worker cutover, API gate, reviewed feature PR and Pages deployment all completed. Final online browser acceptance then found a historical-switch loading-state race, so the release was stopped and both Production Worker and Pages were restored without modifying business logic or production data.

## Forward release audit

- Accepted Candidate Worker: `dividend-dashboard-api-v1-3-production-candidate`
- Accepted Candidate version: `bf54abd0-8159-4e49-9cd9-62f28269038f`
- Forward Production Worker version: `249eb3fa-cd10-4993-bd1e-2f090c9e5aa9`
- Forward Production deployment: `2026-07-16T11:14:46.978Z`
- Feature commit: `3da11d5a179ae8fab193b0f9882a4a3af80537e6`
- Release PR: `#1`
- Forward Pages merge commit: `c0acd37605e460ecd3f9e3590be60655f816e488`
- Forward Pages HTML SHA-256: `fe4916d10faa32d26db9026bf70886032ba3fdeb4793b40c5864afc428f15bc8`

## Passed gates

- Production Worker identity: `production=true`, `releaseCandidate=false`, `environment=production`, `kvWrites=0`.
- Registry v2: enabled codes exactly `000922` and `930955`.
- Latest, Pine, normal history, weekend, missing date, unsupported code, archive and dividend-data: PASS.
- Pine: both latest scores `3`, date `2026-07-14`, engine `pine-v7-red-rocket-final`.
- Desktop latest `000922`: price `5307.5`, DID `4.421`, Pine `3.0`, valuation `39/60`, technical `18.25/40`, final `57.25`.
- Desktop latest `930955`: price `11122.67`, DID `4.604`, Pine `3.0`, valuation `43/60`, technical `17.25/40`, final `60.25`.
- Search: known code matched; `999999` returned `该指数未接入。` without changing the active index.
- Manual Override `8`: `000922` technical increased from `18.25` to `23.25`, final from `57.25` to `62.25`, valuation remained `39`; clearing Override restored Python Auto `3.0` and final `57.25`.
- Historical data identity: a late `000922` history response did not overwrite selected `930955`; the three-way `000922 → 930955 → 000922` race committed only the final index data.
- Desktop and 390×844 layout: `innerWidth=clientWidth=scrollWidth=390`; no horizontal overflow; Console error count 0.
- Mobile latest, known/unknown search and Override/restore: PASS before the blocking history check.
- Scoring rules remained frozen: valuation `/60`, technical `/40`, trend bonus `[-2,+3]`, final clamp `[0,100]`; Pine affected only its 10-point technical sub-item.

## Blocking online acceptance result

After the historical race, the shared backfill button remained permanently labeled `⏳ 计算中...` while `disabled=false`. A later successful history query updated the correct `000922` data and score but still could not restore the button text.

The stale historical payload was correctly discarded, but the stale request's `finally` block owns the shared button restoration only when its old request identity is still current. Once the index changes, neither that request nor the next request can recover the original label because the next request captures the already-stale label as its `original` value. This is a historical-switch UI state race and fails the required mobile/history normal-state gate.

No code repair was attempted during production acceptance.

## Rollback audit

- Worker rollback version: `7221bebb-719e-4265-8dde-ee5632d3a839`
- Worker rollback deployment: `2026-07-16T11:26:21.302Z`
- Worker traffic after rollback: 100% baseline
- Worker health after rollback: HTTP 200, schema `dividend_indices_snapshot_v1`, date `2026-07-14`, codes `000922` and `930955`.
- Pages rollback PR: `#2`
- Pages rollback main commit: `41e96ef78abedd38943a0339cc5b819c034529ef`
- Pages content restored to rollback commit `5c9626226562e5e23a672e2e56373c5e9b9435af`.
- Restored Pages HTML SHA-256: `aba90da354c1c6de15e0c95c92c7cecf9a59f769c66a7b3299835bd71db24a97`
- Official URL after rollback: HTTP 200, title `红利ETF看板`, V1.2 fixed index buttons present.

## Final resource counts

| Resource | Count / result |
|---|---:|
| Production Worker forward deploy | 1 |
| Production Worker rollback deployment | 1 |
| Production KV payload writes | 0 |
| Production KV deletes | 0 |
| Snapshot refreshes | 0 |
| Pages forward publish | 1 |
| Pages rollback publish | 1 |
| Git pushes | 2 |
| Pull requests merged | 2 |
| Force pushes | 0 |
| Production route changes | 0 |
| Secret changes | 0 |
| Pine Engine changes | 0 |
| Pine Resolver changes | 0 |
| Scoring/valuation/macro changes | 0 |

## Required next action

Repair the historical adapter's activation-scoped loading control so every switch clears or transfers button ownership and restores the canonical label. Add a regression assertion for button text and disabled state after stale-response discard, then redeploy and revalidate the isolated Candidate before starting another Production cutover.
