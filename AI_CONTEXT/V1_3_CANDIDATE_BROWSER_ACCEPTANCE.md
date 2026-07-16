# V1.3 Candidate Browser Acceptance

Date: 2026-07-16

Page: <https://dividend-dashboard-api-v1-3-production-candidate.zq609256057.workers.dev/>

## Desktop

| Scenario | Observed result | Status |
|---|---|---|
| Dynamic selector | Two options with names and codes; no fixed index buttons | PASS |
| `000922` | price `5307.5`, DID `4.421`, Python Auto `3.0`, final `57.25` | PASS |
| `930955` | price `11122.67`, DID `4.604`, Python Auto `3.0`, final `60.25` | PASS |
| Code search | `000922` matched and atomically loaded the correct identity | PASS |
| Unknown search | `999999` displayed `该指数未接入。`; current valid index remained intact | PASS |
| Pine Auto | date `2026-07-14`, engine `pine-v7-red-rocket-final` | PASS |
| Manual Override | Pine `8.0`, source `Manual Override`; after calculate: valuation `39/60`, technical `23.25/40`, final `62.25` | PASS |
| Override restore | Clearing Override restored Python Auto `3.0`, technical `18.25/40`, final `57.25` | PASS |
| History | `2026-07-14` displayed `Historical Calculation` and used the history calculation engine | PASS |
| Console | Blocking errors: 0 | PASS |

Override changed only the 10-point Pine component: technical and final each increased by 5 while valuation remained 39.

## Mobile 390×844

- Browser layout viewport: exactly `390×844`.
- Document `scrollWidth`: `390`.
- Horizontal overflow: false.
- `000922` loaded with the same Candidate data.
- Switching to `930955` produced the correct heading, Python Auto state, engine and `60.25` score.
- Blocking Console errors: 0.

Result: **PASS**.

The temporary viewport override was reset and all acceptance tabs were closed after testing.
