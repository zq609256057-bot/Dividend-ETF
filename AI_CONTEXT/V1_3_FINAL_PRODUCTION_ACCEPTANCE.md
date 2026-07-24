# V1.3 Final Production Acceptance

Date: 2026-07-16

## Acceptance status

**V1_3_PRODUCTION_RELEASE_COMPLETE**

Production Worker version `345f3aad-3ca7-4811-a212-6cadbfb441c6` and GitHub Pages `main` commit `88d3885a451da67208256a1110129242f993bc40` passed final online acceptance. The release required no rollback.

## Deployment verification

- Production URL: `https://zq609256057-bot.github.io/Dividend-ETF/` — HTTP 200.
- Production Worker: 100% traffic on `345f3aad-3ca7-4811-a212-6cadbfb441c6`.
- Worker runtime identity: `production=true`, `releaseCandidate=false`, `environment=production`, `kvWrites=0`.
- Remote GitHub `main`: `88d3885a451da67208256a1110129242f993bc40`.
- Pages HTML SHA-256: `fe4916d10faa32d26db9026bf70886032ba3fdeb4793b40c5864afc428f15bc8`.
- Pages history adapter SHA-256: `f19b360cd281c1cecdd23008546a1bc0ede779dbbadce8dd48de54a4ea6ac935`.

## Final gate results

| Gate | Result |
|---|---|
| Production identity and Registry v2 | PASS |
| Latest identity for `000922`, `930955` | PASS |
| Pine Auto score/date/engine | PASS |
| History normal/weekend/missing/unsupported | PASS |
| Legacy archive and dividend-data | PASS |
| Dynamic dropdown and code search | PASS |
| Unknown code rejection | PASS |
| Latest and historical switch isolation | PASS |
| Three-switch race commits only final index | PASS |
| Loading label/disabled-state recovery | PASS |
| Manual Override priority and Auto restoration | PASS |
| Desktop Console | PASS — 0 errors |
| 390×844 mobile layout | PASS — `scrollWidth=390` |
| Mobile controls and Console | PASS — 0 errors |
| Frozen scoring rules and protected assets | PASS |

## Score observations

Clean Production state matched the release reference values:

- `000922`: price `5307.5`, DID `4.421`, Pine `3`, valuation `39/60`, technical `18.25/40`, final `57.25`.
- `930955`: price `11122.67`, DID `4.604`, Pine `3`, valuation `43/60`, technical `17.25/40`, final `60.25`.

The official Pages origin contained existing local trend-history records and therefore displayed the expected stateful trend-adjusted scores `58.85` and `61.85`. Index identity, price, DID, Pine, valuation, and engine remained correct. No browser history was deleted to manufacture the clean-state result.

Manual Override `8` increased only the Pine technical contribution by `5`, left valuation unchanged, and clearing it restored Python Auto `3.0`.

## Historical loading-state closure

The Production adapter now uses request ownership and fixed labels. Only the current history request may update data or restore UI state; stale requests discard without touching shared UI. Normal success, HTTP failure, stale late response, and rapid index switching all restore the button to enabled `查询历史`. Online desktop/mobile checks and deterministic regression tests passed.

## Production protection and rollback

- Production KV writes/deletes: `0/0`.
- Snapshot refresh and `PUT /admin/snapshot`: `0`.
- Pine Engine/Resolver, scoring, valuation, macro, Registry, index set, routes, and Secrets: unchanged.
- Git push/Pages publish/Worker deploy: `1/1/1`.
- Force push: `0`.
- Rollback: not required. Saved Worker version `7221bebb-719e-4265-8dde-ee5632d3a839` and Pages content `5c9626226562e5e23a672e2e56373c5e9b9435af` remain available.

V1.3 is accepted for Production and the release is formally closed.
