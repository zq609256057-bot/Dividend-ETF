# V1.3 Release Completion Report

Date: 2026-07-16

## Final status

**V1_3_PRODUCTION_RELEASE_COMPLETE**

The accepted V1.3 Candidate was promoted to the Production Worker, passed the GET-only API gate, and was then released through reviewed PR #3 to GitHub Pages. Desktop and 390×844 production-browser acceptance passed, including the historical request-ownership regression that caused the preceding rollback. No rollback was required for this release.

## Released identities

- Production URL: `https://zq609256057-bot.github.io/Dividend-ETF/`
- Production Worker: `dividend-dashboard-api`
- Production Worker version: `345f3aad-3ca7-4811-a212-6cadbfb441c6` (100% traffic)
- Worker deployment timestamp: `2026-07-16T12:32:52.803Z`
- Accepted Candidate version: `9d1bbef2-f26f-4467-96ba-8abb3b1af881`
- Feature head: `f8b917a0e46065213a67a0368d16b8898cfd4251`
- Release PR: `#3` — `https://github.com/zq609256057-bot/Dividend-ETF/pull/3`
- Production `main`: `88d3885a451da67208256a1110129242f993bc40`
- Production HTML SHA-256: `fe4916d10faa32d26db9026bf70886032ba3fdeb4793b40c5864afc428f15bc8`
- Production Historical Adapter SHA-256: `f19b360cd281c1cecdd23008546a1bc0ede779dbbadce8dd48de54a4ea6ac935`
- Worker source SHA-256: `d852531aed2c694133136dc5dbf8e5ed873a128934d74e34c91cbdcfdcdc8d41`
- Wrangler bundle SHA-256: `cf61ca345ad8460e77e3c26acfc07815d672fa31c21f1e61a37c6d5c87d369be`

## Worker API acceptance

All checks used read-only GET requests.

| Gate | Result |
|---|---|
| `/health` | PASS — HTTP 200, `production=true`, `releaseCandidate=false`, `environment=production`, `kvWrites=0` |
| `/indices` | PASS — Registry v2; enabled codes exactly `000922`, `930955` |
| `/latest` | PASS — identities and prices `5307.5`, `11122.67` |
| Pine | PASS — both scores `3`, engine `pine-v7-red-rocket-final`, `shadowOnly=true` |
| History normal date | PASS for both indices |
| Weekend | PASS — `DATE_UNAVAILABLE` |
| Missing date | PASS — `DATE_NOT_FOUND` |
| Insufficient history | PASS — deterministic Worker integration branch; not induced live because Registry/KV mutation was prohibited |
| Unsupported `999999` | PASS — rejected |
| `/archive`, `/dividend-data` | PASS for both indices |

## Production browser acceptance

- Dynamic dropdown contains exactly the two Registry indices; no frontend hardcoding fallback was used.
- Automatic latest loading, known-code search, unknown-code rejection, and `000922 ↔ 930955` identity isolation: PASS.
- `000922`: price `5307.5`, DID `4.421`, Pine Auto `3.0`, date `2026-07-14`, engine `pine-v7-red-rocket-final`.
- `930955`: price `11122.67`, DID `4.604`, Pine Auto `3.0`, date `2026-07-14`, engine `pine-v7-red-rocket-final`.
- A clean Production origin produced the frozen reference scores: `000922` valuation `39`, technical `18.25`, final `57.25`; `930955` valuation `43`, technical `17.25`, final `60.25`.
- The official Pages origin retained pre-existing local trend-history records. Its displayed stateful values were `000922` valuation `39`, technical `19.85`, final `58.85`; `930955` valuation `43`, technical `18.85`, final `61.85`. This is the unchanged local trend-history behavior, not stale index data or a scoring-rule change; browser history was deliberately not deleted.
- Manual Override `8` on the stateful `000922` view changed source to `Manual Override`, technical `19.85 → 24.85`, and final `58.85 → 63.85`; valuation stayed `39`. Clearing Override restored Python Auto `3.0`, technical `19.85`, final `58.85`.
- Normal history query displayed `⏳ 计算中...` with the button disabled, then restored `查询历史` with the button enabled.
- Historical stale responses were discarded. The rapid `000922 → 930955 → 000922` sequence ended with only `000922`: price `5307.5`, DID `4.421`, Pine `3.0`, and the history button restored to `查询历史`.
- Deterministic regression tests also passed normal completion, late stale response, three-switch race, and HTTP-error cleanup. The failure path restores the fixed default label and does not reuse an old button label.
- Desktop Console errors: `0`.
- Mobile viewport: `390×844`; `innerWidth=clientWidth=scrollWidth=390`, no horizontal overflow.
- Mobile dropdown, known/unknown search, Pine Auto, Override/restore, history query, button recovery, and rapid switching: PASS.
- Mobile Console errors: `0`.

## Frozen scoring and production protection

- Valuation remains `/60`.
- Technical remains `/40`.
- Trend bonus remains `[-2,+3]`.
- Final score remains clamped to `[0,100]`.
- Pine affects only its 10-point Technical sub-item.
- Pine Engine, Resolver, scoring, valuation, macro, Registry/KV schemas, and index set were not changed.

## Final resource audit

| Resource | Count / result |
|---|---:|
| Production Worker deploy | 1 |
| Production KV payload writes | 0 |
| Production KV deletes | 0 |
| Snapshot refresh | 0 |
| `PUT /admin/snapshot` calls | 0 |
| GitHub Pages publish | 1 |
| Git push | 1 |
| Pull request merged | 1 |
| Force push | 0 |
| Production route changes | 0 |
| Secret changes | 0 |
| Rollback | NOT REQUIRED |

## Rollback readiness

- Saved Worker rollback version: `7221bebb-719e-4265-8dde-ee5632d3a839`.
- Saved Pages rollback content: `5c9626226562e5e23a672e2e56373c5e9b9435af`.
- If a later regression is discovered, restore the exact Worker version and use a normal Git revert. Do not delete KV history, refresh snapshots, or force push.

V1.3 Production Release is complete and the prior historical loading-state blocker is closed.
