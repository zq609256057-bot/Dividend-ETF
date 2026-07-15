# Pine V7 Formal Switch Rollback Guide

No remote rollback was executed. Choose the rollback mode that matches the
incident.

## Mode A — Restore the exact pre-task bytes

This restores all eight formal assets from the local backup:

```sh
cd "/Users/zhouqiang/Documents/Claude Archive Migration/Dividend_Dashboard"

cp -p production_backup/pine_formal_switch_20260715T153653/HTML/index.html HTML/index.html
cp -p production_backup/pine_formal_switch_20260715T153653/HTML/pine_auto_config.js HTML/pine_auto_config.js
cp -p production_backup/pine_formal_switch_20260715T153653/HTML/pine_score_resolver.js HTML/pine_score_resolver.js
cp -p production_backup/pine_formal_switch_20260715T153653/HTML/pine_auto_candidate.css HTML/pine_auto_candidate.css

cp -p production_backup/pine_formal_switch_20260715T153653/github_pages_repo/index.html github_pages_repo/index.html
cp -p production_backup/pine_formal_switch_20260715T153653/github_pages_repo/pine_auto_config.js github_pages_repo/pine_auto_config.js
cp -p production_backup/pine_formal_switch_20260715T153653/github_pages_repo/pine_score_resolver.js github_pages_repo/pine_score_resolver.js
cp -p production_backup/pine_formal_switch_20260715T153653/github_pages_repo/pine_auto_candidate.css github_pages_repo/pine_auto_candidate.css
```

Important: preflight found that the pre-task formal config was already
`PINE_AUTO_ENABLED=true`. Therefore Mode A restores byte identity but does not
disable Auto.

## Mode B — Disable Auto and retain safe Manual behavior

Use this for an Auto API/contract incident. It changes only the feature flag;
the Resolver, Manual Override, and Manual Input remain available.

```sh
cd "/Users/zhouqiang/Documents/Claude Archive Migration/Dividend_Dashboard"

cp -p production_candidate/pine_auto/pine_auto_config.disabled.js HTML/pine_auto_config.js
cp -p production_candidate/pine_auto/pine_auto_config.disabled.js github_pages_repo/pine_auto_config.js

grep -n "PINE_AUTO_ENABLED:false" HTML/pine_auto_config.js github_pages_repo/pine_auto_config.js
cmp HTML/pine_auto_config.js github_pages_repo/pine_auto_config.js
```

Then rerun the local Resolver/formal tests and prepare a separate explicit Git
commit. Do not change the Pine engine, scoring weights, Worker, or KV to perform
this rollback.

## Verification after either mode

```sh
cd "/Users/zhouqiang/Documents/Claude Archive Migration/Dividend_Dashboard"

node HTML/tests/test_pine_score_resolver.mjs
node github_pages_repo/tests/pine_formal_switch_local_test.mjs
git -C github_pages_repo diff --check
git -C github_pages_repo status --short --branch
```

For a remote release that has already been pushed, create a normal revert commit
and push it without force. Remote rollback is outside this task.
