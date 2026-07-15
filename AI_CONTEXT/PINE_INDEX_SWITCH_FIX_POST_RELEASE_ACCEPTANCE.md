# Pine Index Switch Fix — Post-Release Acceptance

Run this only after the user manually pushes the fix and GitHub Pages deploys.

## Release identity

- Production URL: <https://zq609256057-bot.github.io/Dividend-ETF/>
- Record the new `main` commit: `<NEW_COMMIT_SHA>`
- Verify Pages `index.html` SHA-256:
  `aba90da354c1c6de15e0c95c92c7cecf9a59f769c66a7b3299835bd71db24a97`
- Verify Pages `index_switch_atomic.js` SHA-256:
  `15a3d2abb76feb3d349d53d7e4bb0ca9351a9b04165ad89cf192f52df75e94bf`

## Required online scenarios

1. Load production and confirm the selected index auto-loads without clicking
   Auto Fill.
2. Select `930955`, calculate and record price, DID, Pine, date, engine,
   valuation, technical and final score.
3. Click `000922` and confirm the old `930955` price `11122.67`, DID `4.604`,
   technical values and final `60.25` are never shown under the `000922` title.
4. During loading, confirm final score is `--`, calculation is disabled and the
   status names `000922`.
5. Confirm `000922` auto-loads price `5307.5`, DID `4.421`, Pine Auto `3.0`,
   date `2026-07-14`, engine `pine-v7-red-rocket-final`.
6. Switch back to `930955`; confirm no mixed state and no second Auto Fill click
   is required.
7. Set `000922` Override `8`; switch to `930955` and confirm it is not inherited;
   switch back and confirm the `000922` draft is restored.
8. Cancel Override and confirm Python Auto returns.
9. Verify Pine delta changes technical and final scores by the same amount while
   valuation remains unchanged.
10. Verify explicit latest failure leaves old data/score cleared and displays
    current-index manual recovery guidance without any production mutation.
11. Verify normal-page Console has no blocking warning/error.
12. Verify desktop and `390 × 844`; mobile must have no horizontal overflow.

## Production protection

- Worker deployment: none.
- Cloudflare KV writes: `0`.
- Pine engine, scoring rules, valuation and macro hashes remain unchanged.
- Git worktree may contain untracked `.DS_Store`; no other unhandled production
  change is acceptable.

## Closure rule

Only if all checks pass may the separate online acceptance report conclude:

`PINE_V7_PRODUCTION_ACCEPTANCE_PASS`

Otherwise record the exact failed scenario and keep the project blocked.
