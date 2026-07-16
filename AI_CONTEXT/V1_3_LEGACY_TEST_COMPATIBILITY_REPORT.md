# V1.3 Legacy Test Compatibility Report

Date: 2026-07-16

## Audit scope

All local tests containing `PUT /admin/snapshot`, `SNAPSHOT_ADMIN_TOKEN`, or KV Guard headers were inspected. Two legacy tests still used the pre-Guard upload contract:

1. `tests/production_worker_history_test.mjs`
2. `local_integration_tests/test_snapshot_worker.js`

Branch-contained compatibility versions are now located at:

- `github_pages_repo/tests/production_worker_history_test.mjs`
- `github_pages_repo/tests/snapshot_worker_guard_compat_test.cjs`

The auxiliary workspace copies were updated identically for local verification; the release-branch copies are the versioned approval artifacts.

## Contract repair

Successful mock uploads now explicitly include:

- Bearer authorization;
- `X-KV-Allow-Write: true`;
- `X-KV-Puts-Used-Today: 0`.

No test was removed. Existing assertions for unauthorized upload, invalid schema, latest, last-success, health, two-index adapters, three dated snapshots, archive identity, invalid date and missing date remain.

Additional failure-path assertions were added:

- correct token without explicit write approval → `403 KV_WRITE_AUTHORIZATION_REQUIRED`;
- malformed/unknown quota → `400 kv_quota_usage_unknown`;
- projected four puts reaching 950 → `429 KV_QUOTA_GUARD_BLOCKED`;
- identical canonical payload → `SKIPPED_DUPLICATE_PAYLOAD`, with no new mock KV key.

## Result

- Guarded Production history compatibility test: PASS.
- Guarded local snapshot integration test: PASS.
- Candidate guarded upload/history/archive test: PASS.

All writes were to in-memory mock objects. Cloudflare KV writes: 0.
