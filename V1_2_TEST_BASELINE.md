# Dividend Dashboard V1.2 Test Baseline

Freeze verification date: 2026-07-15.

| Gate | Result |
|---|---|
| Pine Resolver migration scenarios | PASS, 8/8 |
| Pine Shadow static suite | PASS, 6/6 |
| Pine static protection total | PASS, 10/10 |
| History Engine unit suite | PASS, 5 tests |
| History cache export validation | PASS, 5,976 unique keys |
| Production history Worker contract/isolation | PASS |
| Shadow Worker failure/boundary/cache paths | PASS |
| Price/MA history state-machine integration | PASS |
| V1.1 core regression | PASS, 9 MA cases + 3 history dates + UI/registry |
| Index Registry config-only extension | PASS |
| Source and Pages inline JavaScript parsing | PASS |
| Production API acceptance | PASS |
| Production HTML | PASS, HTTP 200 and SHA-256 match |

## Production acceptance coverage

- `000922` and `930955`: 2026-07-01, 2026-07-10, 2026-07-13, 2026-07-14 and 2024-01-02; close, SMA60/120/250, Wilder RSI14, 252-day position and Pine match the local immutable engine.
- Arbitrary cross-year proof: `930955` / 2022-10-28 passed.
- Boundary behavior: weekend, holiday/missing date and 249/250-row insufficient history return explicit errors.
- `/latest` and `/archive` remain operational and isolated from history.
- Production UI scoring examples passed, including 930955 / 2026-07-14 at 61.85 and 000922 / 2024-01-02 at 70.4.
- Mobile 390×844 passed with no horizontal overflow and functional historical fill.

## Frozen production identities

- Pages release commit: `6c5500ef041a80fe377d7009602e4e798571de77`
- Pages deployment action: `29394393506` / success
- Worker: `87afacd2-587f-43bf-ba2b-0f213fc8d97f` / 100%
- Production HTML SHA-256: `644e0c2c2e561c3b6e6c6f3dd77258994c3d99bd0b172b50977d16dac904dd47`

Any later release must rerun these gates or document why an explicitly versioned replacement is equivalent.
