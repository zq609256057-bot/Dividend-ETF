# V1.3 Production Preflight Report

Date: 2026-07-16
Branch: `feature/v1.3-production-release-candidate`
Base: `5c9626226562e5e23a672e2e56373c5e9b9435af`
Preparation status: **RELEASE CANDIDATE READY**
Production release status: **NOT AUTHORIZED / NOT DEPLOYED**

## 1. Code changes

- Added isolated `v1_3_production_candidate/` package: Registry, Worker, Candidate HTML/assets, Pine snapshot, tests, README and hash manifest.
- Updated the atomic-switch test's frozen Production Worker hash from the pre-governance value to the approved KV-Guard baseline `6074e0…aae3`. The equality assertion remains strict.
- Added six release-preparation documents under `AI_CONTEXT/`.
- Existing untracked Shadow and prior handoff files were preserved and were not staged or rewritten.

## 2. Worker changes

Only the candidate Worker was created. The formally named Production Worker was not edited or deployed in this task.

Candidate features:

- `dividend_index_registry_v2`, enabled-code exact gate;
- Registry-filtered indices/latest/Pine;
- Production binding name `DIVIDEND_SNAPSHOTS` with an unresolved namespace placeholder;
- existing `SNAPSHOT_ADMIN_TOKEN` Bearer authorization contract;
- explicit KV approval header, canonical SHA duplicate check, 800 warning/950 block quota policy;
- latest, last-success, dated snapshot and history-index writes;
- read-only materialized history plus `/archive` and `/dividend-data` compatibility;
- no route, Cron, scheduled handler, temporary Shadow binding, or plaintext Secret.

## 3. HTML changes

The Candidate HTML contains the dynamic dropdown, six-digit search, unknown-code message, atomic switching, automatic latest fill, history lookup, Pine Auto, Manual Override and scoring. It is the accepted Shadow HTML with only Candidate labels/local-history-key changes. Production root `index.html` remains unchanged at hash `aba90d…24a97`.

## 4. KV impact

- Preparation actual puts/deletes: `0/0`.
- Candidate health and read acceptance: `kvWrites=0`.
- Deployment itself is estimated at 0 KV payload writes.
- A future changed snapshot upload estimates 2 reads, 4 puts, 0 deletes; duplicate upload estimates 1 read, 0 puts.
- All future mutations must use `cloudflare_kv_guard`, explicit authorization and known daily usage.

## 5. Secret requirements

No new Secret is required. Release needs the existing Production namespace ID and existing `SNAPSHOT_ADMIN_TOKEN`, injected by the operator/Wrangler secret store. Neither value was read, printed, written, or committed. This is a mandatory human-confirmation gate.

## 6. Rollback

Pages rollback target is `5c96262`; use `git revert`, never force push. Worker rollback uses the pre-cutover deployed version captured immediately before release. KV history remains intact.

## 7. Test results

| Area | Result |
|---|---|
| Candidate API/Registry/KV/History mock integration | PASS |
| Candidate static release and scoring gate | PASS |
| V1.3 Shadow API/Registry/static browser contract | PASS |
| V1.3 onboarding | 3/3 PASS |
| Pine formal switch | PASS |
| Atomic index switching | PASS after strict hash advanced to KV-Guard baseline |
| KV Guard Python | 7/7 PASS |
| KV Guard Production Worker local mock | PASS |
| History engine | 5 tests + 8 subtests PASS |
| Historical price/MA state | PASS |
| Production and Shadow history read routes | PASS |
| Real desktop browser | PASS |
| 390×844 browser | PASS; `scrollWidth=390`, no horizontal overflow, Console errors 0 |

The old `tests/production_worker_history_test.mjs` was executed and failed `403` because it sends the pre-governance upload request without `X-KV-Allow-Write` and quota headers. It was not deleted or weakened. The candidate integration test exercises the updated guarded upload, dated snapshot materialization, archive read, duplicate skip and quota block successfully. This legacy test must be updated in its authoritative repository before formal release.

Wrangler packaging dry-run was not available because Wrangler is not installed. It remains a blocking item on the release checklist, not a reason to mutate this environment or install packages without approval.

## 8. Risk level

Overall candidate risk: **medium-high** because the eventual Worker cutover spans data, history and Pine endpoints. Residual risk is controlled by exact-code Registry gate, zero-write preparation, isolated candidate name, placeholder namespace, manual Secret gate, staged acceptance and immediate revert path.

## 9. Expected release steps

1. Resolve the legacy guarded-upload test and run the full suite.
2. Install/use an approved Wrangler environment and run a packaging dry-run.
3. Confirm Production namespace/Secret without exposing values.
4. Deploy the isolated candidate Worker name first; run read-only acceptance.
5. Obtain explicit Production cutover authorization.
6. Capture current Worker version, then cut over Worker.
7. Merge the reviewed branch and publish Pages through the normal repository workflow.
8. Run desktop/mobile online acceptance; revert immediately on any identity, Pine, score, history, or Console failure.
