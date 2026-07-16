# V1.3 Candidate Revalidation Report

Date: 2026-07-16

## Deployment

- Worker: `dividend-dashboard-api-v1-3-production-candidate`
- Previous Candidate version: `4fd589f0-8766-4935-bb4b-157c63d8da86`
- Revalidated Candidate version: `d0bdf815-0b3e-4d5b-b368-c826b6a793ab`
- Version created: `2026-07-16T07:50:31.553Z`
- Candidate URL: <https://dividend-dashboard-api-v1-3-production-candidate.zq609256057.workers.dev/>

Dry-run confirmed exactly three bindings: existing snapshot KV, Assets, and `DEPLOYMENT_ENVIRONMENT="candidate"`. The runtime config and dry-run bundle were removed after deployment.

## API revalidation

| Endpoint | Result |
|---|---|
| `/health` | HTTP 200; `production=false`; `releaseCandidate=true`; `environment=candidate`; `kvWrites=0`; date `2026-07-14` |
| `/indices` | Registry v2; exactly `000922`, `930955` |
| `/latest` | Two correct identities; unchanged snapshot/schema/data |
| `/api/shadow/pine/latest` | Both scores 3; engine `pine-v7-red-rocket-final`; `shadowOnly=true` |
| Normal history | HTTP 200; `historical_calculation`; read-only cache |
| Weekend | HTTP 422 `DATE_UNAVAILABLE` |
| Missing date | HTTP 404 `DATE_NOT_FOUND` |
| Unsupported `999999` | HTTP 400 `UNSUPPORTED_CODE` |

## Browser revalidation

Desktop:

- `000922`: price `5307.5`, DID `4.421`, Python Auto Pine `3`, final `57.25`.
- `930955`: price `11122.67`, DID `4.604`, Python Auto Pine `3`, final `60.25`.
- Dynamic switching and Resolver priority text remained correct.
- Blocking Console errors: 0.

Mobile 390×844:

- `innerWidth=390`, `innerHeight=844`, `scrollWidth=390`.
- Horizontal overflow: false.
- Index switching, Pine Auto, engine and score remained correct.
- Blocking Console errors: 0.

## Production protection

- Production Worker version before and after: `7221bebb-719e-4265-8dde-ee5632d3a839`.
- Production Worker deployments: 0.
- Production KV writes: 0.
- Snapshot refreshes: 0.
- GitHub Pages publishes: 0.
- Git pushes: 0.

Conclusion: **V1_3_CANDIDATE_REVALIDATED**.
