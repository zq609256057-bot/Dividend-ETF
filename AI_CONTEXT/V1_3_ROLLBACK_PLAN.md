# V1.3 Rollback Plan

Rollback objective: restore the current Production behavior represented by commit `5c9626226562e5e23a672e2e56373c5e9b9435af` without force push and without deleting historical data.

## Before release

1. Record the Production Pages commit, deployed Worker version ID, Worker source/config SHA-256, namespace binding name, and health response.
2. Confirm latest, last-success and both-index read results.
3. Keep the Worker artifact and config in a local immutable release backup; do not store Secret values.
4. Record candidate and rollback hashes in the release ticket.

## Rollback triggers

- enabled codes differ from `000922,930955`;
- `/indices`, `/latest`, Pine or history returns the wrong index identity;
- automatic data does not load or switches retain stale data;
- Resolver priority or 60/40 scoring changes;
- new blocking Console errors or mobile horizontal overflow;
- unexpected KV mutation, quota guard failure, Secret/binding mismatch, or elevated 5xx rate.

## Worker rollback

Stop further release actions. Deploy the captured pre-cutover Worker artifact using the existing namespace binding and existing Secret reference. Do not refresh a snapshot and do not delete any KV key. Verify `/health`, `/latest`, `/last-success`, both `/dividend-data` codes, archive/history boundaries and unauthorized PUT rejection.

## Pages rollback

Create a normal rollback commit by reverting the reviewed V1.3 release commit. The resulting Pages assets must match `5c96262`. Push the rollback commit normally; never use `git reset --hard`, force push, or an empty commit. Wait for Pages deployment and rerun desktop/mobile acceptance.

## Data treatment

Keep `dividend_indices_latest`, `dividend_indices_last_success`, dated snapshots, history index and all `history_cache:` keys. V1.3 does not change their business schema. Rollback must not use Cloudflare KV deletion, snapshot refresh, or history cleanup.

## Closure

Record the failed gate, exact timestamps, reverted Worker version and rollback commit. Pine, scoring, valuation and macro assets require no separate rollback because this candidate does not modify them.
