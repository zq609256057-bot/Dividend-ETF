# Pine V7 Formal Production Switch — Local Execution Report

Status: `READY_FOR_MANUAL_GIT_PUSH`

Date: 2026-07-15

Branch: `main`

Remote actions: none

## Executive result

The formal files are locally switched to Pine V7 Auto and are ready for manual
Git publication. During preflight, both formal HTML copies were found to already
contain the approved production Resolver integration from commit `ca66903`, plus
the later V1.2 history/data-status work. Replacing them with the older Candidate
HTML would have removed valid V1.2 functionality, so no redundant byte rewrite
was performed.

Verified formal state:

- `HTML/index.html` and `github_pages_repo/index.html` are byte-identical.
- Both load `pine_auto_config.js` followed by `pine_score_resolver.js`.
- Scoring calls `resolvePineScore()` instead of parsing `e_tech3` directly.
- `PINE_AUTO_ENABLED=true`.
- Priority is Manual Override → Python Auto → Manual Input.
- Both `000922` and `930955` are validated by the Resolver.
- The frozen engine identity is `pine-v7-red-rocket-final`.

No GitHub API, `gh`, `git push`, Pages publication, Worker deployment, KV write,
or remote smoke test was executed.

## Backup

Eight formal assets were copied with timestamps preserved to:

`production_backup/pine_formal_switch_20260715T153653/`

The tracked manifest is `PINE_FORMAL_SWITCH_BACKUP_MANIFEST.json`. Every backup
copy matched its source SHA256 at creation time.

## Local candidate refresh

The first extended validation correctly rejected the old local Pine Shadow JSON
because stripping `technical_shadow` no longer reproduced the current canonical
latest snapshot. The local Shadow candidate was regenerated from the current
read-only SQLite using the frozen `research_pine_engine.composite_v7.calculate_v7`
entry point. No production asset changed.

Regenerated candidate results:

- `000922`: Pine date 2026-07-14, score 3.0, exact date alignment.
- `930955`: Pine date 2026-07-14, score 3.0, exact date alignment.
- Shadow validation: passed; canonical equality true.
- Production eligibility remains false; the artifact is local Shadow only.

## Test results

| Suite | Result |
|---|---|
| Formal HTML/flag/Resolver/scoring/history/backup test | PASS |
| PineScoreResolver migration scenarios | 8 PASS |
| Shadow display/contract | 6 PASS |
| Candidate formal static checks | 4 PASS |
| Pine Shadow static checks | 6 PASS |
| Readiness, replay and publish validation | 20 PASS |
| Shadow Worker contract | 20 PASS |
| Existing V1.1 scoring core | 9 MA cases and 3 history dates PASS |
| Historical price/MA state | 4 dates PASS |
| V1.2 history/Pine integration protection | PASS |

The Shadow Worker protection test contained a pre-V1.2 Worker hash. Its test
baseline now reads the authoritative `V1_2_PRODUCTION_BASELINE_MANIFEST.json`
instead of duplicating the stale literal. `production_deploy/worker.js` itself
was not modified.

## Protected hashes

| Protected asset | SHA256 | Result |
|---|---|---|
| Pine V7 engine | `2934b556981283b8b1e2fc3fb5bc626b095ee5111900824bb72f94351660ca55` | unchanged |
| Scoring rules | `98146e82f17a273c6d96c064033c18f3ada98a6a5e73d48ae7cf355fe06de022` | unchanged |
| Production Worker | `a9bfe25723518ab7c14782f57ba141e89f6e30deff99c90b6e2261e72361a516` | unchanged |
| Formal HTML | `644e0c2c2e561c3b6e6c6f3dd77258994c3d99bd0b172b50977d16dac904dd47` | verified switched state |
| Pine Resolver | `29c039e13662d174c9c85c0540bd4782d234cc14c7331aa26518dbfa438e43f4` | unchanged |
| Pine Auto config | `c7d2e8e3fb9bccb04a3be8fadfa5cd1c3e70b945febae434099ec0fa9a0a5cb3` | enabled |

## Local Git state

Only Pine formal-switch documentation, backup manifest, and its local guard test
are intended for staging. The pre-existing untracked `.DS_Store` must remain
unstaged. Formal HTML/config/Resolver/CSS are listed in the manual staging
command for explicit review, but Git will not stage them because their bytes are
already the committed switched versions.

See `PINE_MANUAL_PUSH_COMMANDS.md` for the exact user-run commands and
`PINE_ROLLBACK_GUIDE.md` for byte restoration and Manual-only rollback.

Final local state: `READY_FOR_MANUAL_GIT_PUSH`.
