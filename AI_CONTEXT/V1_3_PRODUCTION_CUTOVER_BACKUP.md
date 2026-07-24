# V1.3 Production Cutover Backup

Date: 2026-07-16

Pre-cutover observation: `2026-07-16T08:06:52Z`

## Production Worker rollback identity

- Worker: `dividend-dashboard-api`
- Rollback version ID: `7221bebb-719e-4265-8dde-ee5632d3a839`
- Version created: `2026-07-15T13:19:22.725Z`
- Traffic allocation: 100%
- Compatibility date: `2026-07-04`
- Handler: `fetch`
- Production route: workers.dev endpoint enabled
- Rollback command contract: `npx wrangler rollback 7221bebb-719e-4265-8dde-ee5632d3a839 --name dividend-dashboard-api`

## Frozen rollback artifacts

- V1.2/Guarded Worker source SHA-256: `6074e0e5dc66cc9b5d9d9e73318ca583f3b2aaf8396ba5b8941ec102ce85aae3`
- V1.2/Guarded config SHA-256: `08a8dea3d140ca6109c699107e9fcbaacde333f241158bf9ba6340d4a4a67fc8`
- Binding: `DIVIDEND_SNAPSHOTS`
- Namespace title: `dividend-dashboard-snapshots`
- Namespace metadata: present; identifier not printed
- Secret metadata: `SNAPSHOT_ADMIN_TOKEN` exists; value not read

Wrangler's read-only version view confirms the current version has the expected Secret and KV binding. The version ID is the authoritative remote rollback point; the hashes identify the frozen local rollback artifacts.

## Pre-cutover health

- HTTP: 200
- Body: `{"status":"ok","schema_version":"dividend_indices_snapshot_v1","as_of_date":"2026-07-14","codes":["000922","930955"],"errors":[]}`

## Pages rollback identity

- Repository: `zq609256057-bot/Dividend-ETF`
- Default branch: `main`
- Remote main/Pages commit: `5c9626226562e5e23a672e2e56373c5e9b9435af`
- Rollback method: normal `git revert`; never force push

## Candidate release identity

- Revalidated Candidate version: `d0bdf815-0b3e-4d5b-b368-c826b6a793ab`
- Shared Worker source SHA-256: `d852531aed2c694133136dc5dbf8e5ed873a128934d74e34c91cbdcfdcdc8d41`
- Feature commit: `5091ef8`

## Pre-cutover safety gates

- Deployment identity: candidate/production/missing/invalid PASS.
- Candidate static/API/history/Pine integration: PASS.
- Atomic index switching: PASS.
- KV Guard: 8/8 PASS.
- Guarded compatibility tests: PASS.

Rollback Worker version was saved before deployment. The forward deployment and the later rollback did not call any mutation endpoint: Production KV writes 0, snapshot refresh 0, Pages publish 0.

## Cutover execution and rollback audit

- Forward Production version: `3674f57e-106b-43ab-b8bd-436b69317b41`
- Forward version created: `2026-07-16T08:09:12.393Z`
- Rollback deployment completed: `2026-07-16T08:17:51.788Z`
- Restored Production version: `7221bebb-719e-4265-8dde-ee5632d3a839` at 100% traffic
- Post-rollback health: HTTP 200; legacy schema `dividend_indices_snapshot_v1`; date `2026-07-14`; codes `000922`, `930955`
- Post-rollback edge sampling: six consecutive cache-busted responses matched the restored legacy health contract
- Remote `main` after rollback: `5c9626226562e5e23a672e2e56373c5e9b9435af`

No Pages commit was merged, so the Pages rollback point remained active and no Pages revert was necessary.
