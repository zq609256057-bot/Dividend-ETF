# V1.3 Production Worker Deploy Report

Date: 2026-07-16

## Deployment result

**NOT DEPLOYED — PRE-DEPLOY WORKER IDENTITY GATE FAILED**

The accepted Candidate source has SHA-256 `25ded732993d98d565009178243af34ad265761a9439b325d7b7a915b924b6b4`, but its `/health` response is hardcoded to:

- service: `dividend-index-management-production-candidate`
- `production: false`
- `releaseCandidate: true`

The required Production acceptance contract is `production=true` with a Production release identity. No reviewed Production source/config variant exists that changes those fields through configuration while keeping the already accepted Candidate artifact byte-identical.

Changing only the Wrangler Worker name to `dividend-dashboard-api` would deploy a Worker that necessarily fails the immediate Production identity gate. Rewriting the source in a temporary bundle would deploy an artifact that was never subjected to Candidate acceptance. Both actions violate the stop condition for Worker identity inconsistency.

## Actions deliberately not performed

- No Production temporary config was rendered.
- No Production dry-run bundle was generated.
- No `wrangler deploy` targeted `dividend-dashboard-api`.
- No Production version was created.
- No route, Secret or namespace binding was modified.
- No KV mutation endpoint was called.

Current Production version remains `7221bebb-719e-4265-8dde-ee5632d3a839`. Candidate version `4fd589f0-8766-4935-bb4b-157c63d8da86` remains isolated and unchanged.
