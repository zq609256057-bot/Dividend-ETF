# V1.3 Manual Release Commands

These commands are documentation only. They were not executed. Sections involving Secrets, Worker deployment or Pages publication require explicit human approval at action time.

## A. Review and commit the candidate branch

```bash
cd "/Users/zhouqiang/Documents/Claude Archive Migration/Dividend_Dashboard/github_pages_repo"
git branch --show-current
git status --short
git diff --check
node v1_3_production_candidate/tests/release_static_gate_test.mjs
node v1_3_production_candidate/tests/production_candidate_test.mjs
node v1_3_shadow/tests/deployment_safety_test.mjs
node v1_3_shadow/tests/index_management_test.mjs
node tests/pine_formal_switch_local_test.mjs
node tests/index_switch_atomic_test.mjs
git add tests/index_switch_atomic_test.mjs v1_3_shadow v1_3_production_candidate AI_CONTEXT/V1_3_PRODUCTION_MIGRATION_PLAN.md AI_CONTEXT/V1_3_PRODUCTION_PREFLIGHT_REPORT.md AI_CONTEXT/V1_3_SCORE_COMPATIBILITY_REPORT.md AI_CONTEXT/V1_3_RELEASE_CHECKLIST.md AI_CONTEXT/V1_3_ROLLBACK_PLAN.md AI_CONTEXT/V1_3_MANUAL_RELEASE_COMMANDS.md
git diff --cached --check
git status --short
git commit -m "feat: prepare V1.3 dynamic index production candidate"
git push origin feature/v1.3-production-release-candidate
```

Do not use `git add .`. Exclude `.DS_Store` and unrelated handoff reports.

## B. Secure Worker packaging preflight — stop for human confirmation

Use an approved environment with Wrangler installed. Obtain the Production namespace ID and confirm the existing `SNAPSHOT_ADMIN_TOKEN` Secret without echoing either value. Render a temporary config outside Git, retaining candidate Worker name and no routes, then run:

```bash
wrangler deploy --config /absolute/path/to/rendered-v1-3-candidate.toml --dry-run
```

Do not proceed if the namespace placeholder remains, the Secret is missing, the estimate is unknown, projected puts are at least 950, or the package introduces routes/Cron/temporary bindings.

## C. Isolated candidate deployment — requires explicit approval

```bash
wrangler deploy --config /absolute/path/to/rendered-v1-3-candidate.toml
```

Run read-only acceptance. Do not call snapshot PUT and do not publish Pages.

## D. Production release — requires separate explicit approval

After review/merge, capture the current Worker version and render the formally named Production config. Deploy Worker first, complete read-only acceptance, then allow the normal GitHub Pages workflow to publish the reviewed main commit. Exact organization-specific merge/deploy commands must be supplied by the release operator; this document intentionally does not embed Secrets or assume authority.

## E. Rollback without force push

```bash
git switch -c rollback/v1.3-production <current-main-commit>
git revert <v1.3-release-commit>
git push origin rollback/v1.3-production
```

Deploy the captured pre-cutover Worker artifact, not a reconstructed one. Do not delete KV history or refresh snapshots.
