# Dividend Dashboard V1.3 Production Candidate

This directory is an isolated release candidate. It must not be deployed over `dividend-dashboard-api` until every item in `AI_CONTEXT/V1_3_RELEASE_CHECKLIST.md` is approved.

- Registry schema: `dividend_index_registry_v2`.
- Enabled release codes: `000922`, `930955` only.
- Candidate Worker name is intentionally not the Production Worker name.
- `DIVIDEND_SNAPSHOTS` uses a placeholder namespace ID until an approved render step.
- `SNAPSHOT_ADMIN_TOKEN` remains a Wrangler secret and is never stored here.
- Snapshot uploads require auth, explicit KV write approval, quota input, canonical duplicate detection, and a four-put estimate.
- History uses read-only `history_cache:<code>:<date>` access.
- Pine remains `pine-v7-red-rocket-final`; Resolver priority is unchanged.
- The `public/` assets promote the audited V1.3 Shadow HTML and index manager. HTML changes are limited to the Candidate title, local-history key, and local-only diagnostic wording.

No deployment, KV write, snapshot refresh, or GitHub Pages publication is part of this package.
