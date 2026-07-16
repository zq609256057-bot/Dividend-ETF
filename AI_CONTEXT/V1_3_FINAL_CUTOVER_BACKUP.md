# V1.3 Final Production Cutover Backup

Date: 2026-07-16
Cutover attempt: loading-state ownership fix promotion

## Production Worker rollback identity

- Worker: `dividend-dashboard-api`
- Active version before cutover: `7221bebb-719e-4265-8dde-ee5632d3a839`
- Version created: `2026-07-15T13:19:22.725Z`
- Active traffic: 100%
- Frozen rollback Worker SHA-256: `6074e0e5dc66cc9b5d9d9e73318ca583f3b2aaf8396ba5b8941ec102ce85aae3`
- Frozen rollback config SHA-256: `08a8dea3d140ca6109c699107e9fcbaacde333f241158bf9ba6340d4a4a67fc8`
- Rollback target is the exact saved version above; no source rebuild is required.

Pre-cutover `GET /health` returned HTTP 200:

```json
{"status":"ok","schema_version":"dividend_indices_snapshot_v1","as_of_date":"2026-07-14","codes":["000922","930955"],"errors":[]}
```

## GitHub Pages rollback identity

- Repository: `zq609256057-bot/Dividend-ETF`
- Remote `main` before cutover: `41e96ef78abedd38943a0339cc5b819c034529ef`
- Restored content baseline: `5c9626226562e5e23a672e2e56373c5e9b9435af`
- Official URL: `https://zq609256057-bot.github.io/Dividend-ETF/`
- Release source branch: `feature/v1.3-production-release-candidate`
- Pages rollback method: normal `git revert`; force push is prohibited.

## Production KV and Secret metadata

- KV binding: `DIVIDEND_SNAPSHOTS`
- Existing Production snapshot namespace metadata: present.
- Namespace identifier: deliberately omitted from this report and all Git-tracked files.
- `SNAPSHOT_ADMIN_TOKEN` metadata: present as `secret_text`.
- Secret value: not read, copied, printed or written.
- Production routes: none.
- Cron triggers: none.

## Accepted forward artifact

- Candidate Worker: `dividend-dashboard-api-v1-3-production-candidate`
- Accepted Candidate version: `9d1bbef2-f26f-4467-96ba-8abb3b1af881`
- Worker source SHA-256: `d852531aed2c694133136dc5dbf8e5ed873a128934d74e34c91cbdcfdcdc8d41`
- Candidate HTML SHA-256: `d27602ec7f98a2fbe799765d47f5a76adeae3b1e88d13eefc33c76441653fdce`
- Index Manager SHA-256: `371f353fd9475f14c6e3c5bd2dfa6579b92e26ff983f96eb2ef2e5dadecf0110`
- Accepted Candidate Historical Adapter SHA-256: `9a74593f4871d3694315c56e600a7addad80a35e5747d0ea9aa8e68a503048a6`
- Candidate acceptance report: `V1_3_FINAL_FIX_ACCEPTANCE_REPORT.md`

The Production Worker promotion will use the byte-identical accepted Worker source and Candidate assets with only the audited deployment identity set to `production`. The Production Pages adapter will be generated from the accepted Candidate adapter with only its exported Production symbol renamed.

## Pre-cutover protection counters

- Production Worker deploys in this attempt: `0`
- Production KV payload writes/deletes: `0/0`
- Snapshot refreshes: `0`
- GitHub Pages publishes: `0`
- Git pushes: `0`
- Production route changes: `0`
- Secret changes: `0`

No `PUT /admin/snapshot` request is authorized in this cutover.
