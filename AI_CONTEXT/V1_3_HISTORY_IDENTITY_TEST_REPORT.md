# V1.3 Historical Query Identity Test Report

Date: 2026-07-16

## Required identity scenarios

| Scenario | Result |
|---|---|
| Normal historical load | PASS — one current response committed to its captured index |
| Switch while history is pending | PASS — old response discarded before field clearing/commit |
| Late `000922` response | PASS — cannot commit into `930955` |
| Late `930955` response | PASS — cannot commit into `000922` |
| Rapid `000922 → 930955 → 000922` | PASS — only final activation committed |
| Historical failure | PASS — current failure retained current fields/score; stale failure produced no DOM error |
| Manual Override during history | PASS — Override remained highest priority and unchanged |
| No `AbortController` fallback | PASS — activation/code comparison alone discarded stale response |

The deployed Candidate adapter additionally passed current commit, stale Pine-context discard, response identity mismatch and Manual Override precedence tests.

## Full regression

| Suite | Result |
|---|---|
| Candidate historical identity tests | PASS |
| Candidate history adapter tests | PASS |
| Candidate static release gate | PASS |
| Candidate API/Registry/KV/history integration | PASS |
| Deployment identity contract | PASS |
| V1.3 index management | PASS |
| V1.3 deployment safety | PASS |
| V1.3 onboarding | 3/3 PASS |
| Pine formal switch | PASS |
| PineScoreResolver | 8 scenarios PASS |
| KV Guard Python | 8/8 PASS |
| KV Guard Worker | PASS |
| History Engine | 5 tests plus 8 date/code subtests PASS |
| Historical price/MA, Production/Shadow routes and guarded compatibility | PASS |
| Existing Production atomic baseline | PASS |

## Browser race reproduction

The local Candidate server delayed historical responses by 350 ms, allowing deterministic race testing in the real Candidate page:

- normal `000922` and `930955` historical values loaded correctly;
- `000922 → 930955` during pending history ended with `930955`, price `11122.67`, DID `4.604`;
- rapid `000922 → 930955 → 000922` ended only with `000922`, price `5307.5`, DID `4.421`;
- no stale error or Pine context appeared;
- Override 8 survived historical loading: valuation `39/60`, technical `23.25/40`, final `62.25` in the deterministic fixture;
- desktop Console errors: 0.

## Remote Candidate browser

- latest baseline: `000922` final `57.25`; Python Auto 3; frozen engine;
- current historical calculation after recalculation: `000922` final `58.85`; `930955` final `61.85` (historical MA state is supplied by the History Engine);
- rapid three-index switch ended with only `000922`, correct price/DID and Python Auto 3;
- Override 8 raised only the Pine technical subscore by 5: historical `000922` final `58.85 → 63.85`; valuation stayed `39/60`;
- missing date failure retained `000922`, price `5307.5`, DID `4.421`, Override 8 and final `63.85`;
- 390×844: `innerWidth=390`, `scrollWidth=390`, both history/index switching and Pine Auto passed;
- blocking Console errors: 0.

The 60-point valuation model, 40-point technical model, `[-2,+3]` trend clamp, `[0,100]` final clamp and Pine 10-point subscore contract remain unchanged.
