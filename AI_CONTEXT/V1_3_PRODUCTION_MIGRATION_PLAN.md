# Dividend Dashboard V1.3 Production Migration Plan

Date: 2026-07-16
Candidate branch: `feature/v1.3-production-release-candidate`
Base and rollback commit: `5c9626226562e5e23a672e2e56373c5e9b9435af`
Status: Production Release Candidate preparation only; no release is authorized.

## 1. Current V1.2 architecture

Production consists of GitHub Pages at the repository root and `dividend-dashboard-api`. The current page and Worker support `000922` and `930955`, Pine V7 Resolver priority `Manual Override > Python Auto > Manual Input`, a frozen 60/40 scoring model, latest/last-success snapshots, dated snapshots, and materialized `history_cache:` reads. Production data resides in `DIVIDEND_SNAPSHOTS`; snapshot mutation is protected by `SNAPSHOT_ADMIN_TOKEN` and the Cloudflare KV Guard.

## 2. V1.3 replacement points

| V1.2 surface | V1.3 candidate replacement | Preserved contract |
|---|---|---|
| Fixed index presentation | `GET /indices` + `dividend_index_registry_v2` | only `000922`, `930955` enabled |
| Static selection controls | dynamic selector and six-digit code search | unknown code is rejected, never auto-created |
| Snapshot exposure | Registry-filtered `/latest` and `/last-success` | same Production KV keys and snapshot schema |
| Historical calculation | Registry validation + read-only `history_cache:<apiCode>:<date>` | identity, weekend, missing date and insufficient-history errors |
| Pine exposure | Registry-filtered bundled Pine V7 response | `pine_v7_shadow_v1`, `shadowOnly=true`, frozen engine |
| Snapshot upload | existing auth plus canonical hash, duplicate, estimate and quota gates | four-key atomic intent, zero puts for duplicates |
| Legacy clients | `/archive` and `/dividend-data` retained | existing dated snapshot and adapter behavior |

The candidate is isolated under `v1_3_production_candidate/`. Its Worker name is intentionally `dividend-dashboard-api-v1-3-production-candidate`; its Wrangler file contains no Production route and a namespace placeholder.

## 3. Principal risks

1. Worker cutover affects latest, history, Pine, legacy archive and upload paths at once. Risk: high; mitigate with staged dry-run, isolated candidate deploy, online acceptance, then route/name cutover.
2. Registry mistakes could expose an unvalidated index. Risk: high; candidate fails closed unless enabled codes are exactly `000922,930955`.
3. KV namespace or Secret mismatch could make reads unavailable or writes unsafe. Risk: high; render from secure operator context only, run duplicate/quota dry-run, never commit values.
4. Candidate HTML depends on frozen Pages assets (`pine_score_resolver.js`, `dashboard_v11_core.js`, history adapter). Risk: medium; hashes and formal-switch tests are gates.
5. The archived legacy history upload test still uses the pre-KV-Guard request contract. Risk: low to candidate runtime but a test-maintenance item; the candidate test covers the guarded contract without deleting the old failure.
6. Wrangler is not installed in this environment. Risk: medium; an operator must run Wrangler packaging dry-run before release approval.

## 4. Rollback path

- GitHub Pages: revert the release commit with a normal `git revert`; the resulting tree restores `5c96262`. No force push.
- Worker: before cutover, save the deployed Worker version ID/config/hash. If acceptance fails, deploy that captured V1.2/guarded artifact with the existing namespace and Secret.
- KV: retain latest, last-success, dated snapshots, history index and `history_cache:`. Do not delete history and do not refresh snapshots as a rollback mechanism.
- Pine: no rollback action is expected because engine and Resolver assets are unchanged.

## 5. Release window

Use a weekday after market-data publication, with at least 60 minutes free of scheduled refresh activity and an operator available for Worker, Pages, and browser acceptance. Pause automated snapshot upload for the cutover window without deleting its schedule. Recommended order: preflight → isolated candidate Worker → read-only acceptance → Production Worker cutover → Pages merge/publish → final acceptance. Any failed gate stops the sequence; there is no retry loop.
