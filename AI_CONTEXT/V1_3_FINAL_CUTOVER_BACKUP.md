# V1.3 Final Production Cutover Backup

Date: 2026-07-16

## Production Worker rollback identity

- Worker: `dividend-dashboard-api`
- Active version before cutover: `7221bebb-719e-4265-8dde-ee5632d3a839`
- Version created: `2026-07-15T13:19:22.725Z`
- Active traffic: 100%
- Compatibility date: `2026-07-04`
- Workers.dev endpoint: enabled
- Frozen rollback Worker SHA-256: `6074e0e5dc66cc9b5d9d9e73318ca583f3b2aaf8396ba5b8941ec102ce85aae3`
- Frozen rollback config SHA-256: `08a8dea3d140ca6109c699107e9fcbaacde333f241158bf9ba6340d4a4a67fc8`
- Rollback command contract: target this version on `dividend-dashboard-api` only.

The active version was confirmed with Wrangler immediately before cutover. The existing Production health endpoint returned HTTP 200 with schema `dividend_indices_snapshot_v1`, date `2026-07-14`, and codes `000922` and `930955`.

## GitHub Pages rollback identity

- Repository: `zq609256057-bot/Dividend-ETF`
- Remote `main`: `5c9626226562e5e23a672e2e56373c5e9b9435af`
- Local `main`: `5c9626226562e5e23a672e2e56373c5e9b9435af`
- Feature branch before release commit: `feature/v1.3-production-release-candidate`
- Pages rollback method: normal `git revert`; force push is prohibited.

## Production metadata protection

- KV binding: `DIVIDEND_SNAPSHOTS`
- Production namespace metadata: present; identifier intentionally omitted.
- `SNAPSHOT_ADMIN_TOKEN` metadata: present; value was not read, copied, logged, or written.
- Custom routes: none.
- Cron triggers: none.

## Accepted forward artifact

- Candidate Worker: `dividend-dashboard-api-v1-3-production-candidate`
- Revalidated Candidate version: `bf54abd0-8159-4e49-9cd9-62f28269038f`
- Shared Worker source SHA-256: `d852531aed2c694133136dc5dbf8e5ed873a128934d74e34c91cbdcfdcdc8d41`
- Candidate HTML SHA-256: `d27602ec7f98a2fbe799765d47f5a76adeae3b1e88d13eefc33c76441653fdce`
- Index Manager SHA-256: `371f353fd9475f14c6e3c5bd2dfa6579b92e26ff983f96eb2ef2e5dadecf0110`
- Historical identity adapter SHA-256: `d40c285cc8efbb5de420414e017c555bbea96a88c1154b7e01ba57a62e735721`

The formal Pages assets are derived from the revalidated Candidate assets. Only deployment identity, Production API URL, local-history key, title, and production adapter naming differ; Pine Engine, Pine Resolver, scoring, valuation, macro and Registry logic remain frozen.

## Pre-cutover counters

- Production Worker deploys in this release attempt: 0
- Production KV writes: 0
- Snapshot refreshes: 0
- GitHub Pages publishes: 0
- Production route changes: 0
- Secret changes: 0
