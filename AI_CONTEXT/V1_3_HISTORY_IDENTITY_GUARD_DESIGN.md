# V1.3 Historical Query Identity Guard Design

Date: 2026-07-16

## Problem

The V1.3 Candidate already protected latest-data switching with an activation counter and `AbortController`, but historical calculation was overridden at page end by the shared Production `history_backfill_shadow_adapter.js`. That adapter read the mutable selected index when building the request and committed the response without validating the originating activation. A response started for `000922` could therefore arrive after selection changed to `930955` and update the wrong page.

## Unified identity contract

Every index-bound asynchronous request now captures one immutable identity:

- `activationId`: the activation generation at request start;
- `requestedIndexCode`: the exact Registry code requested;
- `signal`: the current activation's abort signal when supported.

A response is current only when both conditions hold:

```text
request.activationId == currentActivationId
AND
request.requestedIndexCode == currentSelectedCode
```

Changing the index increments the activation, aborts the previous controller and creates a new identity. Abort is an optimization; the two-field identity comparison remains the mandatory fail-closed fallback when `AbortController` is unavailable or the network ignores cancellation.

## Commit boundaries

Identity is checked before every index-bound DOM mutation:

1. before starting a historical/latest operation;
2. after fetch/JSON mapping and before clearing fields;
3. in `applyDivData()` as a second-line commit guard;
4. before changing date, Pine context, score presentation, success/error messages or button state;
5. before accepting delayed assistant-fill data.

Historical URLs and response mapping use `requestedIndexCode`, never the mutable `_selIndex`. The Candidate adapter also verifies `payload.code === requestedIndexCode`; mismatches fail closed with `IDENTITY_MISMATCH`.

## Candidate-only adapter

The Candidate now loads `history_backfill_candidate_adapter.js` from its own Assets bundle. It preserves the historical calculation API and Pine behavior while adding the unified identity contract. The existing Production `history_backfill_shadow_adapter.js` was not modified.

Historical Pine context is staged inside the mapped response and becomes active only after the response passes identity checks and the data commit succeeds. A stale response cannot change the Pine context.

## Manual Override and failures

The existing Resolver priority remains:

```text
Manual Override > Python Auto > Manual Input
```

Historical loading does not write the manual Pine field or Override checkbox. When Override is enabled, the Candidate adapter delegates to the frozen Resolver result before considering historical Python Auto.

Abort/stale failures are silent discards. A current-index failure may update the current error message, but it does not clear fields, restore an older index, replace Pine state or recalculate the score.

## Frozen scope

No Production HTML/adapter, Production Worker, KV Guard, Pine Engine, Pine Resolver, scoring rules, valuation, macro, Registry contents or snapshot schema changed.
