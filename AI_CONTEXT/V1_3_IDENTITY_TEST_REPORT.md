# V1.3 Identity Test Report

Date: 2026-07-16

## Deployment identity cases

| Case | Expected | Result |
|---|---|---|
| Candidate | HTTP 200; `production=false`; `releaseCandidate=true`; `environment=candidate` | PASS |
| Production | HTTP 200; `production=true`; `releaseCandidate=false`; `environment=production` | PASS |
| Missing variable | HTTP 503; `DEPLOYMENT_ENVIRONMENT_REQUIRED`; never Production | PASS |
| Invalid `staging` | HTTP 503; `DEPLOYMENT_ENVIRONMENT_INVALID`; never Production | PASS |

Candidate and Production valid responses were also compared after removing only identity fields; all common health fields were identical. `/indices` was explicitly verified to remain available without an identity variable, proving that identity validation is isolated to `/health`.

## Regression results

- Deployment identity test: PASS.
- Candidate static release gate: PASS.
- Candidate API/Registry/History/Pine/KV integration: PASS.
- V1.3 dynamic index management: PASS.
- V1.3 Shadow deployment safety: PASS.
- Atomic index switching: PASS.
- Guarded Production history compatibility: PASS.
- Guarded snapshot compatibility: PASS.
- KV Guard: 8/8 PASS, including duplicate, dry-run, authorization, quota and no retry.

No assertion was removed or weakened. Tests used local fixtures or in-memory KV mocks; Cloudflare KV writes: 0.
