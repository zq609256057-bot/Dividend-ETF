# Handoff: Pine Index Switch Atomic Fix

## Status

`READY_FOR_MANUAL_GIT_PUSH`

The local production candidate fixes `INDEX_SWITCH_STALE_DATA_MIXING`. No push,
Pages publication, Worker deployment or KV mutation was performed.

## Root cause

The old selector changed only the code/title/Pine identity. Form refresh lived
behind the separate Auto Fill button, old score presentation was never
invalidated, and the asynchronous response read mutable `_selIndex` without a
request generation or response identity guard.

## Fix

- Added a single `switchIndexAtomically(nextCode)` entry.
- Added `IDLE / LOADING / READY / ERROR` state management.
- Clears prior auto fields, score decomposition, KPIs and final score before the
  browser can paint the new title with old data.
- Automatically loads the selected index; Auto Fill remains a retry/refresh.
- Uses AbortController, a monotonic request ID, captured target code and final
  response-code verification.
- Stores explicit manual values and Pine Override as per-index drafts.
- Keeps Error state free of old-index data while allowing current-index manual
  recovery.
- Routes history replay and data-assistant fills through the same atomic entry.
- Uses localhost-only localStorage history in local tests, guaranteeing zero
  production KV/history writes from browser acceptance.

## Modified candidate files

Production repository:

- `index.html`
- `index_switch_atomic.js` (new)
- `tests/index_switch_atomic_test.mjs` (new)
- `tests/pine_formal_switch_local_test.mjs`
- `PINE_INDEX_SWITCH_FIX_BACKUP_MANIFEST.json` (new)
- five index-switch handoff/audit/test/release documents
- prior untracked online acceptance report retained for the release commit

Canonical workspace copies and supporting tests:

- `HTML/index.html`
- `HTML/index_switch_atomic.js`
- `HTML/tests/test_pine_auto_candidate_static.py`
- `HTML/tests/test_pine_shadow_static.py`
- `tests/history_shadow_html_static_test.mjs`
- `tests/mock_dashboard_server.mjs`
- `local_integration_tests/test_snapshot_html.js`

`HTML/index.html` and `github_pages_repo/index.html` are byte-identical.
`HTML/index_switch_atomic.js` and the Pages copy are byte-identical.

## Candidate hashes

- HTML: `aba90da354c1c6de15e0c95c92c7cecf9a59f769c66a7b3299835bd71db24a97`
- atomic controller:
  `15a3d2abb76feb3d349d53d7e4bb0ca9351a9b04165ad89cf192f52df75e94bf`

## Tests and acceptance

- 15 local regression commands: PASS.
- 1 read-only production API preflight: PASS.
- Desktop browser normal/Override/Auto/manual-isolation/error cases: PASS.
- 390×844 mobile layout and switch: PASS; no horizontal overflow.
- Normal-page Console: no warnings/errors.
- KV write count: `0`.

## Rollback

The exact pre-fix files are under:

`production_backup/pine_index_switch_fix_20260715T215222/`

Their paths, SHA-256, size, mtime and restore destinations are recorded in
`PINE_INDEX_SWITCH_FIX_BACKUP_MANIFEST.json`. After a commit, prefer a normal
`git revert <fix-commit>` and push without force. Before commit, restore the two
HTML copies and frozen adjacent assets from the backup, remove the new atomic
controller/test, then rerun the complete regression suite.

## Next step

Execute only the explicit commands in
`AI_CONTEXT/PINE_INDEX_SWITCH_FIX_MANUAL_PUSH_COMMANDS.md`. After Pages deploys,
run `AI_CONTEXT/PINE_INDEX_SWITCH_FIX_POST_RELEASE_ACCEPTANCE.md`; only that
separate online run may close the previously blocked Pine V7 acceptance.
