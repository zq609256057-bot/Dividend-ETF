# V1.3 Candidate Deploy Report

Date: 2026-07-16

## Deployment identity

- Worker name: `dividend-dashboard-api-v1-3-production-candidate`
- Candidate URL: <https://dividend-dashboard-api-v1-3-production-candidate.zq609256057.workers.dev/>
- Version ID: `4fd589f0-8766-4935-bb4b-157c63d8da86`
- Deployment timestamp: `2026-07-16T06:47:48.680Z`
- Deployment source: Wrangler upload
- Traffic allocation: 100% Candidate version
- Dry-run bundle aggregate SHA-256: `c48ae9087f554a3748b2deda215a580bf716ebbd6933d2ecd43dfbd8961cb480`
- Worker source SHA-256: `25ded732993d98d565009178243af34ad265761a9439b325d7b7a915b924b6b4`

## Deployment procedure

1. Read-only namespace metadata identified the existing snapshot namespace without printing its ID.
2. A mode-0600 temporary config outside the repository replaced only the namespace placeholder and used absolute Candidate source/assets paths.
3. Safety assertions reconfirmed the exact Candidate name, no route/Cron/Shadow binding and no plaintext Secret.
4. `wrangler deploy --dry-run` completed: 28.29 KiB total, 7.33 KiB gzip, two bindings only (`DIVIDEND_SNAPSHOTS`, `ASSETS`).
5. A single deploy created/updated only the isolated Candidate Worker and uploaded its two Candidate static assets.
6. The temporary config and dry-run bundle were deleted after deployment.

No Production route was created. The Production Worker was not targeted.

## Production isolation evidence

- Production Worker version before deployment: `7221bebb-719e-4265-8dde-ee5632d3a839`.
- Production Worker version after deployment: `7221bebb-719e-4265-8dde-ee5632d3a839`.
- Production Pages commit remains `5c9626226562e5e23a672e2e56373c5e9b9435af`.
- Production Worker deploys: 0.
- Production KV writes: 0.
- Production snapshot refreshes: 0.
- GitHub Pages publishes: 0.

## Candidate rollback

The accepted rollback identity is Candidate version `4fd589f0-8766-4935-bb4b-157c63d8da86`. If a later Candidate-only test fails, an authorized operator may restore a previously recorded Candidate version or delete only `dividend-dashboard-api-v1-3-production-candidate`. Production must remain untouched.
