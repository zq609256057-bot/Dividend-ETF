# V1.3 Score Compatibility Report

## Conclusion

The V1.3 Production Candidate does not introduce a scoring model. It promotes the accepted V1.3 Shadow calculation surface and continues to load the frozen Production Resolver.

| Contract | Candidate evidence | Result |
|---|---|---|
| Valuation maximum | `valTotal` displayed and scored as `/60` | PASS |
| Technical maximum | `techTotal` displayed and scored as `/40` | PASS |
| Pine sub-item | Resolver score clamped to `0..10`, then added once to technical | PASS |
| Trend bonus | `Math.max(-2, Math.min(3, trendBonus))` | PASS |
| Final clamp | `Math.max(0, Math.min(100, total + trendBonus))` | PASS |
| Resolver priority | Manual Override before Python Auto before Manual Input | PASS |
| Engine | `pine-v7-red-rocket-final` | PASS |
| Auto schema gates | `pine_v7_shadow_v1`, `shadowOnly=true`, score/date/engine checks | PASS |

## Protected hashes

- Pine Resolver: `29c039e13662d174c9c85c0540bd4782d234cc14c7331aa26518dbfa438e43f4`
- Pine Engine: `2934b556981283b8b1e2fc3fb5bc626b095ee5111900824bb72f94351660ca55`
- Scoring rules: `98146e82f17a273c6d96c064033c18f3ada98a6a5e73d48ae7cf355fe06de022`
- Candidate index manager: `371f353fd9475f14c6e3c5bd2dfa6579b92e26ff983f96eb2ef2e5dadecf0110`
- Candidate HTML: `0959090f069122aa0cb75248c4d4ee4c1591d9ed702c647ed83d4ad914eec06e`

The candidate HTML differs from the accepted Shadow HTML only in the Candidate page title, local-history storage key, and local diagnostic wording. A static gate normalizes those labels and requires byte equality for everything else.

## Browser evidence

- `000922`: Python Auto `3.0`, final `57.25`.
- `930955`: Python Auto `3.0`, final `60.25`.
- `930955` Manual Override `8`: valuation remained `43/60`, technical became `22.25/40`, final became `65.25`; clearing Override restored Python Auto `3.0` and final `60.25`.

Formal Pine switch and atomic index-switch tests pass against the frozen formulas and guard-approved Worker baseline.
