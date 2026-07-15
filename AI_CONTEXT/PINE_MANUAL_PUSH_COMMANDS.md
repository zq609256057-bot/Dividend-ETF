# Pine V7 Manual Git Push Commands

Run these commands manually in Terminal only after reviewing the local reports.
Do not use `gh`, `git add .`, force push, or a GUI publish action.

```sh
cd "/Users/zhouqiang/Documents/Claude Archive Migration/Dividend_Dashboard/github_pages_repo"

git status --short --branch
git diff --check

git add \
  index.html \
  pine_auto_config.js \
  pine_score_resolver.js \
  pine_auto_candidate.css \
  PINE_FORMAL_SWITCH_BACKUP_MANIFEST.json \
  tests/pine_formal_switch_local_test.mjs \
  AI_CONTEXT/PINE_FORMAL_SWITCH_LOCAL_REPORT.md \
  AI_CONTEXT/PINE_SCORE_INTEGRATION_DIFF_REPORT.md \
  AI_CONTEXT/PINE_MANUAL_PUSH_COMMANDS.md \
  AI_CONTEXT/PINE_ROLLBACK_GUIDE.md

git diff --cached --check
git diff --cached --stat
git status --short

git commit -m "Prepare Pine V7 formal production switch"
git push origin main
```

Expected behavior: the four already-committed formal runtime assets may show no
new staged delta because preflight confirmed they are already in the approved
switched state. The manifest, test, and four reports are the expected new staged
files. `.DS_Store` must not be staged.

After the push, deployment/Pages verification is a separate user-controlled
release step and is not authorized by this local-execution task.
