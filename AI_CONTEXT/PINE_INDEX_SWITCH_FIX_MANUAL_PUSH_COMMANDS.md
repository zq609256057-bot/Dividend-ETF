# Pine Index Switch Fix — Manual Push Commands

Codex did not execute any command below. Run them manually from Terminal.

## 1. Pre-commit verification

```sh
cd "/Users/zhouqiang/Documents/Claude Archive Migration/Dividend_Dashboard/github_pages_repo"

git status --short --branch
git diff --check
git diff -- index.html tests/pine_formal_switch_local_test.mjs

shasum -a 256 index.html index_switch_atomic.js
cmp index.html ../HTML/index.html
cmp index_switch_atomic.js ../HTML/index_switch_atomic.js
```

Expected candidate hashes:

```text
aba90da354c1c6de15e0c95c92c7cecf9a59f769c66a7b3299835bd71db24a97  index.html
15a3d2abb76feb3d349d53d7e4bb0ca9351a9b04165ad89cf192f52df75e94bf  index_switch_atomic.js
```

Leave `.DS_Store` untracked.

## 2. Stage only approved files

Do not use `git add .`.

```sh
git add \
  index.html \
  index_switch_atomic.js \
  tests/index_switch_atomic_test.mjs \
  tests/pine_formal_switch_local_test.mjs \
  PINE_INDEX_SWITCH_FIX_BACKUP_MANIFEST.json \
  AI_CONTEXT/HANDOFF_PINE_V7_PRODUCTION_ONLINE_ACCEPTANCE.md \
  AI_CONTEXT/INDEX_SWITCH_ATOMIC_REFRESH_AUDIT.md \
  AI_CONTEXT/HANDOFF_PINE_INDEX_SWITCH_ATOMIC_FIX.md \
  AI_CONTEXT/PINE_INDEX_SWITCH_FIX_TEST_REPORT.md \
  AI_CONTEXT/PINE_INDEX_SWITCH_FIX_MANUAL_PUSH_COMMANDS.md \
  AI_CONTEXT/PINE_INDEX_SWITCH_FIX_POST_RELEASE_ACCEPTANCE.md

git status --short
git diff --cached --check
git diff --cached --stat
```

Confirm `.DS_Store` is still untracked and no Worker, Pine engine, scoring rule,
valuation or macro file is staged.

## 3. Commit and push

```sh
git commit -m "Fix atomic dividend index switching"
git push origin main
```

Do not force push and do not create an empty commit.

## 4. Verify remote commit and deployed bytes

```sh
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/main

curl -sS https://zq609256057-bot.github.io/Dividend-ETF/index.html -o /tmp/dividend-index-switch-index.html
curl -sS https://zq609256057-bot.github.io/Dividend-ETF/index_switch_atomic.js -o /tmp/dividend-index-switch-atomic.js
shasum -a 256 /tmp/dividend-index-switch-index.html /tmp/dividend-index-switch-atomic.js
```

The deployed hashes must match the candidate hashes above before starting the
post-release browser acceptance.
