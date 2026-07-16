# V1.3 Historical Query Identity Fix Report

Date: 2026-07-16

## Result

The Historical Query Identity Race is repaired in the isolated V1.3 Candidate frontend.

## Candidate changes

- `public/index.html`
  - added immutable activation/code/signal capture;
  - applied the contract to latest, historical, assistant-fill, freshness and `applyDivData()` commit paths;
  - made historical URL/mapping use the captured request code;
  - made stale success, timeout, failure and button-state updates no-ops;
  - replaced the shared Production history adapter import with a Candidate-local adapter.
- `public/history_backfill_candidate_adapter.js`
  - retained `/history/calculate` and historical Pine behavior;
  - added abort propagation, activation/code checks and response-code validation;
  - stages Pine context until a successful current-index commit;
  - preserves Manual Override precedence.
- `tests/historical_identity_guard_test.mjs`
  - added the seven required identity scenarios plus no-Abort fallback.
- `tests/history_candidate_adapter_test.mjs`
  - tests the actual deployed Candidate adapter for current commit, stale discard, identity mismatch and Override priority.
- `tests/local_test_server.mjs`
  - added full read-only historical fixtures and a deterministic 350 ms historical delay for browser race reproduction.
- `tests/release_static_gate_test.mjs`
  - keeps the accepted Shadow HTML/CSS/Pine shell invariant, exact scoring-function equality and protected manifest hashes while allowing only the audited Candidate identity runtime.

## Artifact identity

- Candidate HTML SHA-256: `d27602ec7f98a2fbe799765d47f5a76adeae3b1e88d13eefc33c76441653fdce`
- Candidate history adapter SHA-256: `d40c285cc8efbb5de420414e017c555bbea96a88c1154b7e01ba57a62e735721`
- Index manager SHA-256: `371f353fd9475f14c6e3c5bd2dfa6579b92e26ff983f96eb2ef2e5dadecf0110` (unchanged)
- Worker source SHA-256: `d852531aed2c694133136dc5dbf8e5ed873a128934d74e34c91cbdcfdcdc8d41` (unchanged)
- Dry-run aggregate bundle SHA-256: `7dba29441d84d6bd4c393a645057d54e96127b051b9ce43af1c43d965f405727`

## Deployment

- Worker: `dividend-dashboard-api-v1-3-production-candidate`
- Previous Candidate version: `d0bdf815-0b3e-4d5b-b368-c826b6a793ab`
- Revalidated version: `bf54abd0-8159-4e49-9cd9-62f28269038f`
- Deployment timestamp: `2026-07-16T08:43:56.229Z`

Dry-run and deployment used the exact Candidate name, `DEPLOYMENT_ENVIRONMENT="candidate"`, Assets and the existing read-only acceptance KV binding. There was no route, trigger, Cron, temporary Shadow/service binding or plaintext Secret. Temporary rendered configuration and dry-run output were deleted.

## Production protection

Production Worker, Production Pages and all protected business assets remained unchanged. Production KV writes/deletes and snapshot refreshes were zero.
