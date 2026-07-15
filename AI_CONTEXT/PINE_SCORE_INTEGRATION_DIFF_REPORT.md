# Pine V7 Score Integration Diff Report

## Integration boundary

The original manual Pine path was:

```text
e_tech3 → integer clamp 0..10 → technical subtotal
```

The formal path is:

```text
Manual Override
      ↓ else
validated Auto Pine V7
      ↓ else
Manual Input
      ↓
Resolver score clamp 0..10 → same technical subtotal
```

The production-switch commit changed only the Pine input source at the scoring
boundary:

```js
var pineResolution = resolvePineScore();
var tech3 = Math.min(10, Math.max(0, Number(pineResolution.score) || 0));
```

The downstream statement remains `techTotal += tech3` with a maximum of 10.

## Resolver contract

Auto is accepted only when all relevant gates pass:

1. HTTP/API request succeeds.
2. `ok === true` and `schemaVersion === pine_v7_shadow_v1`.
3. `shadowOnly === true`.
4. Production score effect and trade semantics remain `none`.
5. Both enabled index records are present.
6. Pine score is numeric and in `[0,10]`.
7. `engineVersion === pine-v7-red-rocket-final`.
8. Pine date is valid, not later than the selected date, and not older than the
   configured seven-calendar-day limit.

Failure clears Auto payload and resolves to Manual Input. A finite checked
Manual Override is evaluated before Auto and therefore always wins.

## Score protection

| Component | Maximum | Change |
|---|---:|---|
| DID | 20 | none |
| Yield spread | 16 | none |
| CN10Y | 10 | none |
| PB percentile | 10 | none |
| ROE | 4 | none |
| Valuation subtotal | 60 | none |
| Price/MA | 8 | none |
| 252-day position | 7 | none |
| Pine V7 | 10 | input source only |
| RSI | 10 | none |
| Volume | 5 | none |
| Technical subtotal | 40 | none |
| Trend bonus | clamp `[-2,+3]` | none |
| Final score | clamp `[0,100]` | none |

The production switch diff at commit `ca66903` confirms no valuation, macro,
RSI, price/MA, 252-day, volume, trend-bonus, or final-clamp rule was changed.
Current tests additionally assert `/60`, `/40`, `valTotal + techTotal`, the
unchanged trend clamp, and the unchanged 100-point clamp.

## History behavior

Saved records now retain:

- effective resolved Pine score in `e_tech3`;
- original manual value in `e_tech3_manual`;
- source/mode/date/engine identity in `pine_resolution`.

This makes Auto, Override, and Manual results replayable without changing the
existing history record structure or other saved fields.

## Scenario evidence

- Auto success: `Python Auto`; both `000922` and `930955` passed.
- API HTTP 503: `Manual Input` with the manual value retained.
- Invalid schema, engine, score, future date, or expired date: Manual fallback.
- Manual Override: wins over a valid Auto payload.
- Refresh: Resolver initialization calls `refresh()`; stored index selection is
  restored, while Override remains an explicit checkbox action.
- Calculate button: invokes the unchanged `calcScore()` entry point.
- Local Shadow candidate: both indices returned Pine score 3.0 for 2026-07-14.

Conclusion: only the source of the Pine 10-point input changes. The valuation 60,
technical 40, trend bonus, and final 100-point model remain unchanged.
