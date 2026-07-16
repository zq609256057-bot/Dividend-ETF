# V1.3 Candidate Read-only Acceptance

Date: 2026-07-16

Candidate version: `4fd589f0-8766-4935-bb4b-157c63d8da86`

## API acceptance

| Check | Observed result | Status |
|---|---|---|
| `GET /health` | `status=ok`, `production=false`, `releaseCandidate=true`, `kvWrites=0`, date `2026-07-14` | PASS |
| `GET /indices` | Registry v2; exactly `000922`, `930955`; both latest/history available | PASS |
| `GET /latest` | Exactly two matching identities; date `2026-07-14`; no fallback | PASS |
| `GET /api/shadow/pine/latest` | Both scores `3`; engine `pine-v7-red-rocket-final`; `shadowOnly=true`; bundled read-only; `kvWrites=0` | PASS |
| Normal history | `000922`, `2026-07-14` → HTTP 200, `historical_calculation`, `kv_materialized_read_only` | PASS |
| Weekend | `2026-07-12` → HTTP 422 `DATE_UNAVAILABLE` | PASS |
| Missing date | `2026-01-02` → HTTP 404 `DATE_NOT_FOUND` | PASS |
| Insufficient history branch | Same deployed Worker source passes integration assertion → HTTP 422 `INSUFFICIENT_HISTORY` when enabled Registry status is insufficient | PASS (deterministic local contract) |
| Unsupported code | `999999` → HTTP 400 `UNSUPPORTED_CODE` | PASS |

The live Registry marks both released indices as history-ready, so producing `INSUFFICIENT_HISTORY` online would require changing Registry state. That mutation was prohibited; the branch was verified against the identical deployed Worker source hash instead.

## Identity samples

- `000922`: price `5307.5`, DID `4.421%`, Pine `3`, date `2026-07-14`.
- `930955`: price `11122.67`, DID `4.604%`, Pine `3`, date `2026-07-14`.

## Scoring protection

The release static gate confirms the accepted Shadow HTML is unchanged except Candidate-local diagnostic labels and storage namespace labels. It also verifies:

- valuation subtotal: `/60`;
- technical subtotal: `/40`;
- Pine clamped to `0..10` and used only as the technical Pine component;
- trend bonus clamped to `[-2,+3]`;
- final score clamped to `[0,100]`;
- Resolver priority remains `Manual Override → Python Auto → Manual Input`;
- engine remains `pine-v7-red-rocket-final`.

No PUT, POST, PATCH or DELETE request was sent during acceptance. Production KV writes: 0. Snapshot refreshes: 0.
