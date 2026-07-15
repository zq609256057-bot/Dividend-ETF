# History Engine V1.2 Freeze

## Production contract

`GET /history/calculate?code=<code>&date=YYYY-MM-DD`

Successful results identify `source: historical_calculation`, `notLatest: true`, `notArchive: true`, and contain valuation, macro, technical, Pine and future-data-protection metadata.

```text
market_kline.sqlite (read-only, immutable)
  → History Engine
  → technical calculator + frozen Pine V7 + validator
  → history_cache:<code>:<date>
  → Worker /history/calculate
  → HTML historical fill
```

## Frozen rules

- SQLite remains read-only and all inputs are bounded by target date.
- Technical indicators and the V1.1 20-row price/MA state machine are reused, not reimplemented.
- Pine calls `research_pine_engine.composite_v7.calculate_v7`.
- Missing valuation/macro data is `unavailable`, never zero.
- Invalid, unavailable, missing and insufficient-history dates return explicit typed errors.

## Namespace isolation

`latest`, `archive`, and `history_cache:` are three independent spaces. History calculation cannot read as latest, silently fall back to archive, or mutate either space. Archive remains available for compatibility; V1.2's normal historical-fill path is `/history/calculate`.

V1.2 production cache baseline: 5,976 records, 30 chunks, codes `000922`/`930955`, dates 2008-05-26 through 2026-07-14.
