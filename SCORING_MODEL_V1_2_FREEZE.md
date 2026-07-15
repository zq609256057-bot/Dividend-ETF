# Scoring Model V1.2 Freeze

## Frozen 100-point structure

- Valuation: 60 points.
- Technical: 40 points.

Technical allocation:

| Component | Points |
|---|---:|
| Price / moving-average structure | 8 |
| 252-day price position | 7 |
| Pine | 10 |
| RSI | 10 |
| Volume | 5 |
| Total technical | 40 |

Pine mode is Auto, sourced from Python Pine V7 (`pine-v7-red-rocket-final`).

## Price/MA frozen behavior

The V1.1 20-trading-record trend state machine remains authoritative. Its raw 0–10 score maps to 0–8 by `rawScore / 10 * 8`. It must not be replaced by a same-day-only comparison.

## Change control

V1.2 freezes valuation logic, macro logic, all weights, technical 40 points and total 100 points. Any future scoring change requires an impact report, regression/backtest evidence, review, and a versioned release; it cannot be made directly in production.
