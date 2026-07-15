# Index Switch Atomic Refresh Audit

## Scope and baseline

- Production baseline: `2196dbc3b69a5f9ab72a066b47b3562c949149ed`
- Production URL: <https://zq609256057-bot.github.io/Dividend-ETF/>
- Blocking defect: `INDEX_SWITCH_STALE_DATA_MIXING`
- Frozen areas: Pine V7 algorithm/engine, score weights, valuation, macro,
  production Worker and Cloudflare KV.

## Pre-fix switch chain

1. `renderIndexSelector()` created one button per enabled registry entry.
2. Each button independently called `selectIndex(item.code, '')`.
3. `selectIndex()` immediately changed `_selIndex`, `_selEtf`, button highlight,
   the selector label, the page title and selected-index localStorage.
4. `selectIndex()` did not clear any auto-filled field, score decomposition,
   KPI, final score or prior data identity.
5. `selectIndex()` did not request the new index's latest snapshot.
6. Latest data was loaded only by the separate **自动填入今日数据** action,
   through `autoFill()` → `fetchAndFillDiv()`.
7. `fetchAndFillDiv()` fetched the all-index `/latest` snapshot and, only after
   the response arrived, read the then-current mutable `_selIndex` to select the
   item passed to `applyDivData()`.
8. `applyDivData()` populated the valuation, macro and technical fields and
   updated the title, but did not validate a durable request/response identity.
9. `calcScore()` continued to display the last valuation subtotal, technical
   subtotal, trend bonus and clamped final score until the user recalculated.
10. PineScoreResolver separately listened to the index buttons and resolved
    from `_selIndex`, so Pine switched immediately while the rest of the form
    remained on the old index.

## Exact mixed-state cause

The title/Pine identity mutation and the snapshot/form/score mutation belonged
to different event paths. The first path completed synchronously; the second
did not run until a separate user action. Therefore the browser could render:

```text
new _selIndex + new title + new Pine selection
old valuation fields + old technical fields + old final score
```

The defect was deterministic, not a cache-only issue.

## Manual state and localStorage audit

- Display inputs mark explicit edits with `dataset.manualOverride='true'`.
- Auto fill preserves those marked fields.
- Before this fix there was no per-index draft container; a manual value or
  Pine Override could remain visible when the selected index changed.
- `div_sel_index` stored only the selected code, not isolated drafts.
- Score history was keyed by record code, but the live form was shared.
- Local browser calculation called `cloudSave()` against the production history
  endpoint even during local testing; the fix adds localhost-only localStorage
  dry-run behavior. Production behavior is unchanged.

## Concurrency audit

The old latest request had:

- no AbortController;
- no monotonic request ID;
- no captured target code;
- no response-code check at DOM commit time.

During `000922 → 930955 → 000922`, a slower earlier response could use the
latest mutable `_selIndex` and write data without proving which user action it
belonged to.

## Fixed architecture

All selector, retry, history replay and data-assistant transitions now converge
on `switchIndexAtomically(nextCode, options)`, backed by
`index_switch_atomic.js`.

State sequence:

```text
IDLE → LOADING → READY
               ↘ ERROR
```

At `LOADING`, in one synchronous event turn:

1. save the old index's explicit manual draft;
2. set the new index identity;
3. clear all auto fields and all old score presentation;
4. restore only the new index's own manual draft;
5. resolve Pine against the new code;
6. disable calculation and show `正在加载 <code> 数据……`.

The controller aborts the prior request, increments a monotonic request ID and
captures the target code. A response may commit only when:

- its request ID is still current;
- its target remains current;
- the mapped response `index` equals the target code.

On failure the cleared state is retained, the new index remains explicit, old
score/data are not restored, and current-index Manual Input/Override remains
available.

## Pine and scoring boundary

Pine priority remains exactly:

```text
Manual Override → Python Auto → Manual Input
```

The switch fix does not change the Resolver, Pine engine, 0–10 clamp,
valuation 60, technical 40, trend bonus `[-2,+3]`, or final `[0,100]` clamp.

