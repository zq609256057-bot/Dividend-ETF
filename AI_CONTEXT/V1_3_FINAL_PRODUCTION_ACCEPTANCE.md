# V1.3 Final Production Acceptance

Date: 2026-07-16

## Acceptance status

**V1_3_PRODUCTION_RELEASE_ROLLED_BACK**

The Production Worker and Pages release were both deployed and exercised at the official URL. All API gates, final score values, index data identity, search, Pine Auto, Manual Override, desktop layout and most mobile checks passed. The release did not close because the historical-switch race leaves the shared backfill button in a permanent loading label. The saved Worker and Pages baselines were restored immediately.

## Production URL and release identity

- URL: `https://zq609256057-bot.github.io/Dividend-ETF/`
- Forward Worker version: `249eb3fa-cd10-4993-bd1e-2f090c9e5aa9`
- Forward Pages merge: `c0acd37605e460ecd3f9e3590be60655f816e488`
- Forward HTML SHA-256: `fe4916d10faa32d26db9026bf70886032ba3fdeb4793b40c5864afc428f15bc8`

## Online results before rollback

| Gate | Result |
|---|---|
| Dynamic dropdown | PASS — two Registry indices |
| `000922` latest | PASS — `5307.5`, `4.421`, Auto `3.0`, final `57.25` |
| `930955` latest | PASS — `11122.67`, `4.604`, Auto `3.0`, final `60.25` |
| Known/unknown search | PASS |
| Manual Override/restore | PASS — +5 technical/final, valuation unchanged |
| Historical normal query | PASS — requested identity and Historical Calculation source |
| Late-response data discard | PASS — no cross-index price/DID/Pine/score overwrite |
| Three-switch race data identity | PASS — only last index committed |
| Race loading-state cleanup | **FAIL** — button label stuck at `⏳ 计算中...` |
| Desktop Console | PASS — 0 errors |
| 390×844 overflow | PASS — `scrollWidth=390` |
| Mobile search and Override | PASS |
| Mobile history normal state | **FAIL** — stale loading label persists after successful query |

The failure is reproducible only after the switch race. The button is enabled, and a later history query returns correct data, but the label remains incorrect because the new request captures the old loading text as its restoration value.

## Restored Production state

- Worker: `dividend-dashboard-api`
- Active Worker version: `7221bebb-719e-4265-8dde-ee5632d3a839` at 100%
- Worker rollback health: HTTP 200, schema `dividend_indices_snapshot_v1`, date `2026-07-14`, codes `000922`, `930955`.
- Pages main: `41e96ef78abedd38943a0339cc5b819c034529ef`
- Pages restored content: prior Production commit `5c9626226562e5e23a672e2e56373c5e9b9435af`
- Restored HTML SHA-256: `aba90da354c1c6de15e0c95c92c7cecf9a59f769c66a7b3299835bd71db24a97`
- Official URL after rollback: V1.2 page, HTTP 200.

## Production protection

- KV writes/deletes: `0/0`
- Snapshot refresh: `0`
- Pine Engine/Resolver changes: `0/0`
- Scoring, valuation and macro changes: `0`
- Force push: `0`
- Rollback used a normal Worker version rollback and a normal GitHub `git revert` PR.

The V1.3 release must remain closed as rolled back until the loading-state race is fixed and the Candidate is revalidated.
