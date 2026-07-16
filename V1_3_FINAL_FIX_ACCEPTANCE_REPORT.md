# V1.3 Final Fix Acceptance Report

Date: 2026-07-16

## Final status

**V1_3_FINAL_FIX_CANDIDATE_ACCEPTANCE_PASS**

The Historical Switch Loading State Race Condition is fixed in the isolated V1.3 Candidate and the Candidate has passed local, API, desktop browser and 390×844 mobile acceptance. Production Worker and Production Pages remain on the rollback baseline; this task did not perform a Production cutover.

**Recommendation: APPROVE A NEW, SEPARATELY CONTROLLED PRODUCTION CUTOVER.**

## 1. Pre-change repository state

- Branch: `feature/v1.3-production-release-candidate`
- Starting commit: `ca5f381ed3f824c95a650d4357c870ee5b75f46c`
- The branch was one commit ahead of its remote tracking branch.
- Pre-existing uncommitted audit documents and untracked reports were present. They were preserved and were not included in this fix.

The following rollback reports were reviewed before editing:

- `AI_CONTEXT/V1_3_FINAL_PRODUCTION_ACCEPTANCE.md`
- `AI_CONTEXT/V1_3_RELEASE_COMPLETION_REPORT.md`
- `AI_CONTEXT/V1_3_PRODUCTION_WORKER_FINAL_DEPLOY_REPORT.md`

All three identify the same isolated failure: stale historical data was discarded correctly, but the shared history button could retain `⏳ 计算中...` after a rapid index switch.

## 2. Root cause

The old Historical Adapter captured the button's current text at request start and restored that captured value in `finally`.

During a switch race:

1. request A changed the button to the loading label;
2. request B began while that label was visible and captured the loading label as its supposed original value;
3. request A became stale and correctly discarded its data;
4. request B completed and restored the captured loading label.

Data identity, stale response discard, API payloads, Pine and scoring were not the cause. The defect was shared UI-state ownership.

## 3. Modified files

- `v1_3_production_candidate/public/history_backfill_candidate_adapter.js`
- `v1_3_production_candidate/tests/history_candidate_adapter_test.mjs`
- `v1_3_production_candidate/tests/release_static_gate_test.mjs`
- `v1_3_production_candidate/release_manifest.json`
- `V1_3_FINAL_FIX_ACCEPTANCE_REPORT.md`

No Production HTML, Production Historical Adapter, Worker source, Pine Engine, Pine Resolver, scoring rule, valuation, macro, Registry/API schema, KV schema or snapshot schema file was changed.

## 4. Fix design

The Candidate Historical Adapter now uses explicit request ownership:

- every valid historical request increments `historyRequestId`;
- the new request becomes `currentRequestId`;
- a request may update data, error presentation or button state only when its `requestId` equals `currentRequestId` and its captured index identity is still current;
- stale requests return without touching UI state;
- button labels are fixed constants:
  - default: `查询历史`
  - loading: `⏳ 计算中...`
- success, current-request failure and current-request cancellation all restore the fixed default label;
- no button text is read and cached as a restoration source.

The Candidate HTML shell was deliberately not modified. The adapter normalizes the button to the canonical default label when it loads.

## 5. Regression and local gate results

| Gate | Result |
|---|---|
| Normal `000922` historical request restores `查询历史` | PASS |
| Rapid `000922 → 930955 → 000922` commits only final `000922` and restores button | PASS |
| Late old response is discarded and cannot overwrite data/button state | PASS |
| HTTP error restores default label and enabled state | PASS |
| Candidate historical identity suite | PASS |
| Candidate release static gate | PASS |
| Candidate API/Registry/KV/History integration | PASS |
| Candidate deployment identity gate | PASS |
| V1.3 index management and deployment safety | PASS |
| V1.3 onboarding | 3/3 PASS |
| Pine formal switch and atomic index switch protection | PASS |
| KV Guard | 8/8 PASS |
| Production Worker KV mock | PASS |
| History Engine | 5 tests, including 8 code/date subtests, PASS |
| Historical price/MA and history route suites | PASS |

The host's default Python does not include `pytest`. The affected standard-library-compatible suites were run through `unittest` or their test functions directly; no dependency was installed and no assertion was weakened.

An older non-Candidate diagnostic, `local_integration_tests/test_snapshot_html.js`, still asserts a removed V1.2 initialization string in `HTML/index.html`. It is outside this Candidate release gate and was not modified to conceal that pre-existing incompatibility.

## 6. Candidate build and deployment identity

- Worker: `dividend-dashboard-api-v1-3-production-candidate`
- New Candidate version: `9d1bbef2-f26f-4467-96ba-8abb3b1af881`
- Previous Candidate version: `bf54abd0-8159-4e49-9cd9-62f28269038f`
- Deployment timestamp: `2026-07-16T11:50:43.731Z`
- Candidate URL: `https://dividend-dashboard-api-v1-3-production-candidate.zq609256057.workers.dev/`
- Worker source SHA-256: `d852531aed2c694133136dc5dbf8e5ed873a128934d74e34c91cbdcfdcdc8d41`
- Dry-run bundle SHA-256: `cf61ca345ad8460e77e3c26acfc07815d672fa31c21f1e61a37c6d5c87d369be`
- Candidate HTML SHA-256: `d27602ec7f98a2fbe799765d47f5a76adeae3b1e88d13eefc33c76441653fdce`
- Historical Adapter SHA-256: `9a74593f4871d3694315c56e600a7addad80a35e5747d0ea9aa8e68a503048a6`

The dry-run and deployment used the exact Candidate Worker name, `DEPLOYMENT_ENVIRONMENT=candidate`, no custom route, no Cron, no Shadow/service binding, no plaintext Secret and an external mode-0600 temporary config. Only the changed Historical Adapter asset was uploaded; the temporary config and bundle were deleted after use.

## 7. Read-only Candidate API acceptance

| Endpoint | Result |
|---|---|
| `GET /health` | PASS — `production=false`, `releaseCandidate=true`, `environment=candidate`, `kvWrites=0` |
| `GET /indices` | PASS — Registry v2, exactly `000922` and `930955` |
| `GET /latest` | PASS — both index identities and latest values correct |
| Pine latest | PASS — both scores `3`, `shadowOnly=true`, engine `pine-v7-red-rocket-final` |
| `000922` history | PASS — HTTP 200, requested identity, Historical Calculation |
| `930955` history | PASS — HTTP 200, requested identity, Historical Calculation |
| Weekend | PASS — `DATE_UNAVAILABLE` |
| Unsupported `999999` | PASS — `UNSUPPORTED_CODE` |

Only GET requests were used during remote acceptance.

## 8. Browser acceptance

### Desktop latest

| Index | Price | DID | Pine | Valuation | Technical | Final |
|---|---:|---:|---:|---:|---:|---:|
| `000922` | 5307.5 | 4.421 | Python Auto 3.0 | 39 / 60 | 18.25 / 40 | 57.25 / 100 |
| `930955` | 11122.67 | 4.604 | Python Auto 3.0 | 43 / 60 | 17.25 / 40 | 60.25 / 100 |

The Pine date remained `2026-07-14` and the engine remained `pine-v7-red-rocket-final`.

### Loading ownership

- Request start: button `⏳ 计算中...`, disabled.
- Request completion: button `查询历史`, enabled.
- Rapid `000922 → 930955 → 000922`: final selected/data identity `000922`, price `5307.5`, DID `4.421`, Python Auto Pine `3.0`; button `查询历史`, enabled.
- The historical calculation score for the final `000922` request was `58.85` because the historical price/MA state machine uses its 20-row context. A clean latest reload remained `57.25`; this is expected mode-specific scoring, not stale data.

### Pine priority protection

- Manual Override `8`: source `Manual Override`, valuation `39/60`, technical `23.25/40`, final `62.25/100`.
- Clearing Override: source `Python Auto`, Pine `3.0`, valuation `39/60`, technical `18.25/40`, final `57.25/100`.

### Mobile 390×844

- `innerWidth=390`
- `clientWidth=390`
- `scrollWidth=390`
- no horizontal overflow
- rapid history switch finished on `000922`
- button restored to `查询历史` and enabled
- Pine source remained Python Auto
- Console errors: `0`

## 9. Frozen logic and production protection

Protected hashes remained unchanged:

- Pine Resolver: `29c039e13662d174c9c85c0540bd4782d234cc14c7331aa26518dbfa438e43f4`
- Pine V7 Engine: `2934b556981283b8b1e2fc3fb5bc626b095ee5111900824bb72f94351660ca55`
- Scoring rules: `98146e82f17a273c6d96c064033c18f3ada98a6a5e73d48ae7cf355fe06de022`
- Guarded Production Worker source: `6074e0e5dc66cc9b5d9d9e73318ca583f3b2aaf8396ba5b8941ec102ce85aae3`
- Production V1.3 HTML working copy: `fe4916d10faa32d26db9026bf70886032ba3fdeb4793b40c5864afc428f15bc8`
- Production Historical Adapter working copy: `66a35e5f835d596280755e74b778216984af7c29e9ceac87e00afde73c4713be`

Resource changes in this task:

- Candidate Worker deploys: `1`
- Production Worker deploys: `0`
- Production Pages publishes: `0`
- KV writes/deletes: `0/0`
- Snapshot refreshes: `0`
- Pine/Resolver/scoring/valuation/macro changes: `0`

## 10. Cutover recommendation

All gates required for this isolated fix are satisfied. The new Candidate version is suitable to re-enter the existing Production Cutover runbook.

The next operation must remain a separately approved Production cutover with:

1. saved current Production Worker and Pages rollback identities;
2. exact promotion of the accepted Candidate Historical Adapter;
3. Production Worker/API read-only gate;
4. Pages publication;
5. immediate desktop and 390×844 history-race acceptance;
6. rollback on any button-state, identity, Console or scoring discrepancy.

This report does not authorize or claim a Production release.
