# Dividend Dashboard V1.2 Production Freeze Handoff

## Freeze identity

- Version: Dividend Dashboard V1.2
- Release date: 2026-07-15
- Status: Production Frozen
- Production business release commit: `6c5500ef041a80fe377d7009602e4e798571de77`
- Worker version: `87afacd2-587f-43bf-ba2b-0f213fc8d97f` at 100%
- Pages Action: `29394393506`, success

The documentation freeze commit is intentionally separate from the business release commit. It adds no business code and does not redefine the V1.2 production asset identity.

## Protected hashes

| Asset | SHA-256 |
|---|---|
| Production HTML | `644e0c2c2e561c3b6e6c6f3dd77258994c3d99bd0b172b50977d16dac904dd47` |
| History adapter | `520a17da78a7bb5abca491072d93458d2289c13b084373450c2a2a9532b1d1eb` |
| Worker source | `a9bfe25723518ab7c14782f57ba141e89f6e30deff99c90b6e2261e72361a516` |
| Pine V7 engine | `2934b556981283b8b1e2fc3fb5bc626b095ee5111900824bb72f94351660ca55` |
| Pine Resolver | `29c039e13662d174c9c85c0540bd4782d234cc14c7331aa26518dbfa438e43f4` |
| Pine Auto config | `c7d2e8e3fb9bccb04a3be8fadfa5cd1c3e70b945febae434099ec0fa9a0a5cb3` |
| Scoring rules | `98146e82f17a273c6d96c064033c18f3ada98a6a5e73d48ae7cf355fe06de022` |
| Registry config/runtime | `65ebdd2a…c51e` / `989145d3…8b5b` |
| SQLite | `9bbec9ecc3f6344bb8ebca9ea3e4810ba069b1014cbdf1498d71e23a82f0817d` |

Full values and deployment metadata are in `V1_2_PRODUCTION_BASELINE_MANIFEST.json`.

## Architecture and sources

The system is `data → calculation → shadow/production → Worker → HTML`. Latest uses the canonical latest snapshot; history uses immutable SQLite, History Engine, frozen Pine V7 and `history_cache:`; archive remains a separate compatibility space. Market, valuation, macro, Pine, history and registry contracts are documented in `DATA_SOURCE_REGISTRY.md` and `AI_CONTEXT/DIVIDEND_DASHBOARD_V1_2_ARCHITECTURE.md`.

## Frozen scoring

Total remains 100: valuation 60 plus technical 40. Technical is price/MA 8, 252 position 7, Pine 10, RSI 10 and volume 5. Pine is Auto from Python V7. The price/MA component uses the V1.1 20-row trend state machine. No scoring, valuation, macro, Pine or weight change was made by this freeze.

## History baseline

`/history/calculate` serves 5,976 materialized records for `000922` and `930955`, spanning 2008-05-26 through 2026-07-14. Missing dates/data return typed errors or explicit `unavailable`; no zeros or silent archive/latest fallback. Cache, latest and archive are isolated.

## Operations and rollback

Daily operations check data freshness, Worker health/latest, Pages Action/page hash, Pine Auto identity and recent/boundary history calls. Use `DIVIDEND_PRODUCTION_OPERATIONS_MANUAL.md` for incident response and `ROLLBACK_GUIDE_V1_2.md` for layer-specific non-destructive rollback. Previous Worker is `5b423a8b-9fc7-4b30-8ce2-d278966a2df7`; pre-V1.2 Pages is `087aa40b093fcb89c038eccda0eb00bad9506687`.

## Future development

Start from this baseline on a feature branch. Test, Shadow-validate, review, release and verify production. New indices enter through Registry and data/history validation. Any scoring change requires an Impact Report and a new version. See `FUTURE_DEVELOPMENT_RULES.md`.

## Freeze verification

Pine Resolver 8/8, Shadow 6/6, Static 10/10, History Engine, cache export, Worker, HTML, Registry and production API all pass. Production page returned HTTP 200 with the exact frozen HTML hash; Worker remained on the V1.2 version. Details are in `V1_2_TEST_BASELINE.md`.
