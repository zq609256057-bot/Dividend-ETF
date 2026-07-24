# V1.3 Production Worker Deploy Report

Date: 2026-07-16

## Deployment result

The accepted V1.3 Worker was deployed to the exact Production name and passed the immediate read-only API gate. The release was subsequently rolled back because the pre-Pages full regression exposed a Pages history/index identity race.

## Forward deployment

- Worker: `dividend-dashboard-api`
- Version ID: `3674f57e-106b-43ab-b8bd-436b69317b41`
- Version created: `2026-07-16T08:09:12.393Z`
- Deployment observed: `2026-07-16T08:09:15.227Z`
- Worker source SHA-256: `d852531aed2c694133136dc5dbf8e5ed873a128934d74e34c91cbdcfdcdc8d41`
- Dry-run aggregate bundle SHA-256: `473d711868f64967fdb8f6aad62e76744cdd33cc933297810057b876b3445608`
- Runtime identity: `production=true`, `releaseCandidate=false`, `environment=production`
- Runtime bindings: existing `DIVIDEND_SNAPSHOTS`, Assets, and non-secret Production environment identity
- Secret metadata: existing `SNAPSHOT_ADMIN_TOKEN` reference preserved; value was never read or printed

The temporary Production config used the exact Production name, the existing namespace binding, no custom route, no Cron, no Shadow/service binding and no plaintext Secret. It and the dry-run output were securely deleted after rollback.

## Immediate read-only Worker acceptance

All checks passed before any Pages action:

- `/health`: HTTP 200, Production identity correct, `kvWrites=0`.
- `/indices`: Registry v2, exactly `000922` and `930955`.
- `/latest`: both index identities and values correct.
- Pine: score 3 for both indices, engine `pine-v7-red-rocket-final`, `shadowOnly=true`.
- History: normal date passed; weekend returned `DATE_UNAVAILABLE`; absent date returned `DATE_NOT_FOUND`.
- Unsupported `999999`: rejected with `UNSUPPORTED_CODE`.
- `/archive` and both legacy `/dividend-data` identities passed.

Only GET requests were used. No `/admin/snapshot` request was made.

## Rollback

- Trigger: pre-Pages regression found that Candidate `fillHistoricalDate()` applies a completed response without the active index activation/abort identity gate. A request started for one index can therefore commit after selection changes to another index.
- Rollback target: `7221bebb-719e-4265-8dde-ee5632d3a839`
- Rollback deployment: `2026-07-16T08:17:51.788Z`
- Result: restored version at 100% traffic.
- Verification: deployment status reports the rollback version; after propagation, six consecutive cache-busted health reads matched the restored legacy health contract.

Resource audit: one forward Worker version was deployed and one rollback deployment restored the baseline. Production KV writes 0, snapshot refreshes 0, KV deletes 0, route changes 0 and Secret changes 0.
