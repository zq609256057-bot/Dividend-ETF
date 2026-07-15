# Pine V7 Production Online Acceptance & Release Closure

## 1. Acceptance decision

**Final status: `PINE_V7_PRODUCTION_ACCEPTANCE_BLOCKED`**

The production release is online and the Pine V7 Auto/Override/Manual priority
chain works. However, acceptance item 5 is not fully satisfied: switching the
index button changes the index title and Pine Resolver selection, but the
already-filled valuation/technical form values and the displayed final score
remain from the previous index until the user clicks **自动填入今日数据** again.

Observed reproduction:

1. Select `930955`, run **自动填入今日数据**, then calculate. The page shows
   price `11122.67`, DID `4.604`, final score `60.25`.
2. Click `000922` only.
3. The title immediately becomes `中证红利指数 · 000922`, and Pine resolves the
   selected code as `000922`, but the visible form still shows price `11122.67`,
   DID `4.604`, and final score `60.25` from `930955`.
4. Clicking **自动填入今日数据** then replaces the values with `000922` data
   (price `5307.5`, DID `4.421`) and calculation produces `57.25`.

No business code was changed during this acceptance. The only generated file is
this report.

## 2. Production identity and deployment

- Production URL: <https://zq609256057-bot.github.io/Dividend-ETF/>
- Expected Git commit: `2196dbc3b69a5f9ab72a066b47b3562c949149ed`
- Local `HEAD`: expected commit
- Local `main`: expected commit
- Local `origin/main`: expected commit
- Commit time: `2026-07-15T21:26:39+08:00`
- GitHub Pages response: HTTP `200`, `server: GitHub.com`
- Pages `Last-Modified`: `Wed, 15 Jul 2026 13:27:15 GMT`
- Deployment conclusion: **PASS**

The deployed production assets are byte-identical to the assets at the local
and remote `main` commit:

| Asset | Local SHA-256 | Production SHA-256 | Result |
|---|---|---|---|
| `index.html` | `644e0c2c2e561c3b6e6c6f3dd77258994c3d99bd0b172b50977d16dac904dd47` | same | PASS |
| `pine_auto_config.js` | `c7d2e8e3fb9bccb04a3be8fadfa5cd1c3e70b945febae434099ec0fa9a0a5cb3` | same | PASS |
| `pine_score_resolver.js` | `29c039e13662d174c9c85c0540bd4782d234cc14c7331aa26518dbfa438e43f4` | same | PASS |

The GitHub connector returned no pull-request workflow runs for this commit;
that wrapper does not list the push-triggered Pages deployment. Deployment was
therefore established from the Pages HTTP response, deployment timestamp, and
exact production/local/remote asset identity.

## 3. Production page and Pine data

The production page loaded successfully with title `红利ETF看板`. The live Pine
endpoint returned `ok=true`, `schemaVersion=pine_v7_shadow_v1`,
`shadowOnly=true`, `productionScoreEffect=none`, and `tradeSemantics=none`.

| Index | Source | Pine score | Date | Engine | Valuation | Technical | Final |
|---|---|---:|---|---|---:|---:|---:|
| `000922` 中证红利 | Python Auto | 3.0 | 2026-07-14 | `pine-v7-red-rocket-final` | 39 / 60 | 18.25 / 40 | 57.25 / 100 |
| `930955` 红利低波100 | Python Auto | 3.0 | 2026-07-14 | `pine-v7-red-rocket-final` | 43 / 60 | 17.25 / 40 | 60.25 / 100 |

The live endpoint `generatedAt` value was
`2026-07-14T13:40:26.171200+00:00`. Both index records passed the production
Resolver date, schema, score-range and engine checks.

## 4. Auto, Override and Fallback

### Auto

- `000922`: `Python Auto · Auto`, score `3.0` — PASS.
- `930955`: `Python Auto · Auto`, score `3.0` — PASS.
- Pine Resolver returned the currently selected index code after switching;
  Pine itself was not resolved under the previous code — PASS.

### Manual Override

On `000922`, Manual Input was set to `8` and Manual Override enabled:

- source changed to `Manual Override`;
- mode changed to `Override`;
- effective Pine score changed from `3.0` to `8.0`;
- technical subtotal changed from `18.25 / 40` to `23.25 / 40`;
- valuation remained `39 / 60`;
- final score changed from `57.25` to `62.25`.

This proves Override has higher priority than a valid Auto payload and that the
effective Pine value enters the technical 40-point subtotal — PASS.

After unchecking Override, the page immediately returned to `Python Auto`,
score `3.0`, date `2026-07-14`, engine `pine-v7-red-rocket-final`. Recalculation
restored technical `18.25 / 40` and final `57.25` — PASS.

### Manual fallback

The exact live production Resolver asset contains the following failure path:

- Auto request is HTTP `GET` with `cache: no-store`;
- request/schema/engine/date/score failure clears the Auto payload;
- resolution then returns `source: Manual Input` and retains a finite manual
  score;
- Manual Override is evaluated before Auto.

The unchanged local formal regression test also exercised HTTP/API failure and
contract failures and passed. No destructive online fault injection or
production endpoint mutation was performed — PASS.

## 5. Scoring consistency

The deployed score boundary remains:

```text
resolvePineScore() → clamp Pine to [0,10] → techTotal += Pine
```

Verified unchanged rules:

| Rule | Production rule | Result |
|---|---|---|
| Valuation subtotal | DID 20 + spread 16 + CN10Y 10 + PB 10 + ROE 4 = 60 | PASS |
| Technical subtotal | MA 8 + 252-day 7 + Pine 10 + RSI 10 + volume 5 = 40 | PASS |
| Trend bonus | clamp `[-2,+3]` | PASS |
| Final score | clamp `valTotal + techTotal + trendBonus` to `[0,100]` | PASS |
| Pine contribution | effective Resolver value, max 10 | PASS |

Interactive evidence showed that increasing only Pine from 3 to 8 increased
technical and final score by exactly 5 while valuation stayed unchanged.

Regression command:

```text
node tests/pine_formal_switch_local_test.mjs
```

Result: `Pine formal switch: production HTML, flag, Resolver gates, scoring
formula, refresh, history and backup integrity PASS`.

Frozen asset hashes remained unchanged:

- Pine V7 engine `research_pine_engine/composite_v7.py`:
  `2934b556981283b8b1e2fc3fb5bc626b095ee5111900824bb72f94351660ca55`
- scoring rules:
  `98146e82f17a273c6d96c064033c18f3ada98a6a5e73d48ae7cf355fe06de022`
- production Worker:
  `a9bfe25723518ab7c14782f57ba141e89f6e30deff99c90b6e2261e72361a516`

## 6. Browser, Console and responsive layout

### Desktop

- Browser viewport: `1280 × 720`.
- Page loaded, both index controls and all Pine fields were operable.
- Document width equalled viewport width (`1280`); no horizontal overflow.
- Console warnings/errors captured during acceptance: none.
- Result: PASS.

### Mobile

- Explicit viewport: `390 × 844`.
- `documentElement.scrollWidth = 390` and `body.scrollWidth = 390`.
- No horizontal overflow.
- Index selector, Pine panel and score area remained rendered within the
  390-pixel viewport.
- Auto state remained visible with score `3.0`, date `2026-07-14` and the
  frozen engine version.
- Viewport override was reset after testing.
- Result: PASS.

## 7. Index isolation defect

| Check | Result |
|---|---|
| Resolver uses newly selected index code | PASS |
| New index title/label is immediate | PASS |
| New index data after clicking Auto Fill | PASS |
| Old form values cleared or replaced at index-button switch | **FAIL** |
| Old displayed final score cleared at index-button switch | **FAIL** |

This creates a temporary mixed-index state: the heading and Pine selection
identify the new index while valuation/technical fields and the displayed score
still belong to the previous index. Because the task explicitly requires that
index switching not reuse the previous index's data, this is release-closing.

Recommended follow-up (outside this read-only task): make `selectIndex()` clear
the filled data and score immediately, or atomically fetch/fill the newly
selected index before presenting it as current. Then rerun this exact online
acceptance.

## 8. Production asset protection

- No business source file was edited.
- No `git push`, commit, deployment, `gh` command, Worker deployment, KV write,
  or Cloudflare mutation was executed.
- Production browser/API traffic used read-only page loads and HTTP GETs.
- Browser interactions changed only page-local form state/local storage used by
  the acceptance scenarios.
- Pre-report Git worktree: clean except untracked `.DS_Store`.
- `git diff --check`: PASS.
- The requested report is the only deliberate new workspace file after that
  clean-state check.

## 9. Rollback point

- Current production release commit: `2196dbc3b69a5f9ab72a066b47b3562c949149ed`.
- Pine Auto production-switch commit: `ca66903`.
- Pre-Pine-Auto source anchor: `c255cdd`.
- Preferred operational rollback for an Auto incident: replace only
  `pine_auto_config.js` with the prepared disabled config from
  `production_candidate/pine_auto/pine_auto_config.disabled.js`, rerun tests,
  and publish through a normal commit (no force push).
- Full restoration instructions remain in `AI_CONTEXT/PINE_ROLLBACK_GUIDE.md`.

No rollback was executed during this acceptance.

## 10. Closure conclusion

Pine V7 itself is deployed, resolves valid live data for both indexes, respects
Override/Auto/Manual priority, feeds the unchanged 60/40/bonus/100 scoring
model, and has no blocking browser or responsive-layout error.

The Pine migration project **cannot yet be formally closed**, because the
production index switch exposes stale values and a stale score from the prior
index until Auto Fill is run again. After that isolation defect is fixed and
the online acceptance rerun, the remaining Pine-specific evidence is already
release-ready.

