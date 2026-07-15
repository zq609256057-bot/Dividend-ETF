# Dividend Dashboard V1.2 Architecture

## Frozen production topology

```text
Data layer
  market_kline.sqlite / index_valuation_daily / bond_yield_daily
        ↓
Calculation layer
  snapshot calculators / History Engine / frozen Pine V7
        ↓
Shadow and production layer
  validation, immutable materialization, release gates
        ↓
Worker layer
  /latest /archive /history/calculate
        ↓
HTML layer
  latest autofill, historical fill, Pine Auto, scoring and index UI
```

## Request chains

### latest

The local collector reads configured sources, calculates the canonical latest snapshot, and publishes it into the Worker's latest keyspace. `GET /latest` returns that snapshot to the HTML today's-data workflow. It does not consult history cache.

### history/calculate

`market_kline.sqlite` is opened with `mode=ro&immutable=1` and `PRAGMA query_only=ON`. The History Engine selects only rows on or before the target date, reuses the technical calculator and frozen Pine V7, validates the result, and materializes `history_cache:<code>:<date>`. The Worker returns it through `GET /history/calculate`; the HTML displays `Historical Calculation` and the target date. It never silently falls back to archive or latest.

### Pine

K-line history flows into `research_pine_engine.composite_v7.calculate_v7`. Latest Pine Auto is supplied through the configured Pine shadow API and accepted by the frozen browser Resolver under the V1.2 contract. Historical Pine is calculated during history materialization from target-date-bounded rows. Engine identity is `pine-v7-red-rocket-final`.

### Macro

`bond_yield_daily` supplies CN10Y. The calculation layer combines it with the target-date valuation dividend yield to derive yield spread and its historical percentile. Missing target-date inputs produce `unavailable` and null fields, never zero substitution.

### Valuation

`index_valuation_daily` supplies dividend yield/DID percentile, PB, PE TTM, ROE and implied ROE inputs. Latest and history snapshots preserve source, quality, estimated/fallback metadata. Missing history is explicit `unavailable`.

### Registry

`local_data_collector/config/index_registry.json` is the single configuration source (`code`, `name`, `apiCode`, `enabled`). The generated browser `index_registry.js` drives selection and titles. Enabled V1.2 indices are `000922` and `930955`; adding an index must start in the registry and pass data/history validation.

## Isolation contracts

- `latest`: current canonical snapshot only.
- `archive`: legacy frozen snapshots retained for compatibility and rollback.
- `history_cache:`: dynamically calculated historical results and explicit boundary errors.
- History requests cannot overwrite or mutate latest/archive.
- Pine, scoring weights, valuation, macro and the 100-point structure are frozen.
