# V1.3 Deployment Identity Contract

Date: 2026-07-16

## Purpose

One Worker source supports Candidate and Production without source duplication. Runtime identity is selected only by the non-secret Wrangler variable `DEPLOYMENT_ENVIRONMENT`.

## Allowed identities

| Variable | `production` | `releaseCandidate` | `environment` | Service identity |
|---|---:|---:|---|---|
| `candidate` | false | true | `candidate` | `dividend-index-management-production-candidate` |
| `production` | true | false | `production` | `dividend-index-management-production` |

No other value is accepted. Candidate Wrangler commits `DEPLOYMENT_ENVIRONMENT="candidate"`. The Production value exists only in a reviewed, uncommitted runtime template and must never be inferred from a missing value.

## Fail-closed contract

- Missing or empty variable: HTTP 503, `DEPLOYMENT_ENVIRONMENT_REQUIRED`.
- Unknown value, including `staging`: HTTP 503, `DEPLOYMENT_ENVIRONMENT_INVALID`.
- Both error responses explicitly set `production=false` and `releaseCandidate=false`.
- Error responses use `status=configuration_error`, `environment=null` or the rejected value, and `kvWrites=0`.

The identity check is scoped to `GET /health`. It cannot silently promote an unknown deployment to Production.

## Business isolation

The following handlers do not consult deployment identity and remain byte-for-byte unchanged in this implementation:

- `/indices`
- `/latest`
- `/history/calculate`
- `/archive`
- `/dividend-data`
- `/api/shadow/pine/latest`
- `/admin/snapshot` KV Guard path

Registry, snapshot schema, Pine snapshot, Resolver, scoring, valuation and macro assets are unchanged. Only `/health` gains configuration-driven identity fields; its snapshot status, KV counter, Registry schema and date behavior remain unchanged for valid environments.
