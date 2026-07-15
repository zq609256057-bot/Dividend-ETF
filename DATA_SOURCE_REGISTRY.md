# Dividend Dashboard V1.2 Data Source Registry

| Domain | Production source | Update method | Frozen fields/outputs | Failure handling |
|---|---|---|---|---|
| Market | `market_kline.sqlite` / `market_kline` | Local collector sync, then validated snapshot/cache publication | OHLC, close, change, volume, amount, date, source, quality | Reject missing/non-normal dates; history reports `DATE_NOT_FOUND`, `DATE_UNAVAILABLE` or `INSUFFICIENT_HISTORY`; no fabricated values |
| Valuation | `market_kline.sqlite` / `index_valuation_daily` | Collector table update and snapshot calculation | dividend yield, DID percentile, PB, PB percentile, PE TTM, PE percentile, ROE/implied ROE and provenance | Return `status: unavailable`, reason and null for absent historical data; never fill zero |
| Macro | `market_kline.sqlite` / `bond_yield_daily` (`CN10Y`) | Bond-yield collector update; target-date calculation | CN10Y, yield spread, yield-spread percentile, dates, window, quality | Return `unavailable` if CN10Y or valuation input is absent; keep last-known/date metadata explicit where applicable |
| Pine technical | `research_pine_engine.composite_v7.calculate_v7` | Python calculation from date-bounded K-lines; latest delivered through Pine Auto API | V7 score, engine version, calculation date | Resolver shows explicit fallback/error state under its frozen contract; no alternate Pine implementation |
| Historical | History Engine + `history_cache:<code>:<date>` | Immutable SQLite read, calculate, validate, materialize to KV | valuation, macro, technical, Pine, identity and metadata | Typed 400/404/422/5xx errors; UI displays reason and logs errors; no latest/archive fallback |
| Index metadata | `config/index_registry.json` → generated `index_registry.js` | Config-only registry build and validation | code, name, apiCode, enabled | Unsupported/disabled codes are rejected explicitly |

## Read-only history contract

Historical calculation opens SQLite with `mode=ro&immutable=1` and enables `PRAGMA query_only=ON`. Queries use `date <= target_date`; database hash protection verifies that calculation does not alter the source.
