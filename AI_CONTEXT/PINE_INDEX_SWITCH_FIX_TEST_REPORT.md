# Pine Index Switch Atomic Fix Test Report

## Result

All required local regression and browser acceptance checks passed. The online
production page was not changed or republished in this task.

## Automated tests

Sixteen commands passed: 15 local regression commands plus one read-only V1.2
production API preflight.

| Area | Command/result |
|---|---|
| Atomic state machine | `node github_pages_repo/tests/index_switch_atomic_test.mjs` — PASS |
| Inline JavaScript | `node tests/check_inline_scripts.mjs` — PASS for both HTML copies |
| Registry | `python3 tests/test_index_registry.py` — PASS |
| Pine formal switch | `node github_pages_repo/tests/pine_formal_switch_local_test.mjs` — PASS |
| Pine Resolver | `node HTML/tests/test_pine_score_resolver.mjs` — 8 scenarios PASS |
| Pine Shadow display | `node HTML/tests/test_pine_shadow_display.mjs` — 6 tests PASS |
| Pine static protection | Python unittest suites — 10 tests PASS |
| Shadow Pine Worker | Worker test suite — 20 tests PASS |
| V1.1 scoring core | 9 MA cases, 3 history dates and UI/registry checks PASS |
| Snapshot HTML | raw-value/display mapping and current two-index snapshot PASS |
| Snapshot Worker | upload/latest/last-success/health adapter test PASS |
| V1.2 history HTML | approved integration and unchanged history functions PASS |
| V1.2 history Shadow Worker | origin/cache/error paths PASS |
| V1.2 production history route | identity/cache/boundary isolation PASS |
| Production Worker history | dates/not-found/invalid-date paths PASS |
| Production API preflight | 10 calculations, arbitrary 2022 date, boundaries, `/latest`, `/archive` PASS |

The new atomic suite covers synchronous stale-data clearing, normal commit,
wrong-code response rejection, API failure, three rapid switches and
last-request-only commit. Existing assertions were not removed or relaxed;
legacy fixed hashes were advanced to the authorized candidate while preserving
exact pre-fix backup and frozen-asset checks.

## Desktop browser acceptance

Candidate URL used localhost with a read-only mock snapshot source. Local score
history was forced to browser localStorage; no production history POST occurred.

1. `930955` auto-loaded without clicking Auto Fill.
2. Calculation produced price `11122.67`, DID `4.604`, valuation `43/60`,
   technical `17.25/40`, final `60.25/100`, Pine `Python Auto 3.0`.
3. Clicking `000922` removed the prior final score and produced `-- / 100`
   before any new calculation. The old `930955` price/DID/technical values were
   not observed under the new title.
4. `000922` auto-loaded price `5307.5` and DID `4.421` without a second click.
5. `000922` Override `8` produced valuation `39/60`, technical `23.25/40`,
   final `62.25/100`.
6. Cancelling Override restored Auto `3.0`, technical `18.25/40` and final
   `57.25/100`; valuation stayed `39/60`.
7. Switching to `930955` did not inherit the `000922` manual value or checkbox.
8. Switching back restored the `000922` index-specific draft.
9. Normal candidate Console warnings/errors: none.

## Failure and race acceptance

- Unreachable latest API: new index title remained explicit; price, DID,
  technical fields and final score stayed empty; error text identified the
  current index and allowed current-index Manual/Override.
- Wrong response identity: rejected by automated controller test.
- Three rapid switches: the first two results were marked stale; only the final
  target committed.
- Shadow Pine API failure remains handled by the unchanged Resolver's Manual
  Input fallback tests.

## Mobile 390×844

- viewport: exactly `390 × 844`;
- `documentElement.scrollWidth = 390` and `body.scrollWidth = 390`;
- no horizontal overflow;
- selector and loading/ready status were readable and operable;
- Pine Auto/Override controls remained visible;
- switching `000922 → 930955` loaded the correct price/DID, cleared total to
  `-- / 100`, and did not inherit Override.

## Frozen and production assets

- Pine engine SHA-256:
  `2934b556981283b8b1e2fc3fb5bc626b095ee5111900824bb72f94351660ca55`
- scoring rules SHA-256:
  `98146e82f17a273c6d96c064033c18f3ada98a6a5e73d48ae7cf355fe06de022`
- production Worker SHA-256:
  `a9bfe25723518ab7c14782f57ba141e89f6e30deff99c90b6e2261e72361a516`
- Shadow Worker SHA-256:
  `ac1619d70223bf4a2059a3d4d1dae7c465257d5faf86128a87e5a390eeb3c3f6`
- Cloudflare KV writes: `0`.

