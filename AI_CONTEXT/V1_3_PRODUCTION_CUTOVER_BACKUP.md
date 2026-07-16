# V1.3 Production Cutover Backup

Date: 2026-07-16

Cutover attempt status: **STOPPED BEFORE DEPLOYMENT**

## Production Worker rollback identity

- Worker name: `dividend-dashboard-api`
- Current version ID: `7221bebb-719e-4265-8dde-ee5632d3a839`
- Version created: `2026-07-15T13:19:22.725Z`
- Version source: Secret Change
- Traffic allocation: 100%
- Compatibility date: `2026-07-04`
- Handler: `fetch`
- Workers.dev endpoint remains the Production route.

The version ID above is the authoritative Worker rollback point. A rollback must target only `dividend-dashboard-api`; KV history must be retained.

## Frozen local rollback artifacts

- Production Worker source SHA-256: `6074e0e5dc66cc9b5d9d9e73318ca583f3b2aaf8396ba5b8941ec102ce85aae3`
- Production Wrangler config SHA-256: `08a8dea3d140ca6109c699107e9fcbaacde333f241158bf9ba6340d4a4a67fc8`
- Binding name: `DIVIDEND_SNAPSHOTS`
- Snapshot namespace title: `dividend-dashboard-snapshots`
- Namespace metadata: present; identifier intentionally redacted
- Secret metadata: `SNAPSHOT_ADMIN_TOKEN` exists as `secret_text`; value was not read

Wrangler version metadata confirms the deployed version has the expected Secret and KV binding. Wrangler does not expose a remote source hash in this read-only view, so the source hash above identifies the frozen local rollback artifact and matches the protected V1.3 manifest entry.

## Pre-cutover health

- HTTP status: 200
- Response: `{"status":"ok","schema_version":"dividend_indices_snapshot_v1","as_of_date":"2026-07-14","codes":["000922","930955"],"errors":[]}`
- Observed at: `2026-07-16T07:06:41Z`

## Pages rollback identity

- Remote `main`: `5c9626226562e5e23a672e2e56373c5e9b9435af`
- Rollback strategy: normal `git revert`; never force push

## Protection counters at stop

- Production Worker deploys: 0
- Production KV writes: 0
- Snapshot refreshes: 0
- GitHub Pages publishes: 0

Rollback Worker version is saved and independently readable through Wrangler deployment status.
