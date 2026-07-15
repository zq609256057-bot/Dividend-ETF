# Dividend Dashboard V1.2 Rollback Guide

## Baseline rollback points

- V1.2 production Pages release: `6c5500ef041a80fe377d7009602e4e798571de77`
- Pre-V1.2 Pages commit: `087aa40b093fcb89c038eccda0eb00bad9506687`
- V1.2 Worker version: `87afacd2-587f-43bf-ba2b-0f213fc8d97f`
- Previous Worker version: `5b423a8b-9fc7-4b30-8ce2-d278966a2df7`
- Local backup manifest: `production_backup/v1_2_history_backfill/V1_2_ROLLBACK_MANIFEST.json`

## HTML / Pages rollback

Prefer a reviewed `git revert 6c5500ef041a80fe377d7009602e4e798571de77` on a rollback branch, verify the diff contains only the V1.2 release assets, merge/push, and wait for Pages success. Do not reset branch history or manually edit the production page.

If only freeze documentation must be removed, revert the documentation commit separately; that does not roll back V1.2 business assets.

## Worker rollback

Restore 100% traffic to Worker version `5b423a8b-9fc7-4b30-8ce2-d278966a2df7`, or restore the backed-up Worker source and deploy through the normal release workflow. Record both old/new version IDs and traffic allocation.

## Git revert control

Use non-destructive revert commits, inspect staged paths explicitly, and never use `git add .`, `git reset --hard`, or force-push for production recovery. Keep Pages and Worker rollback decisions independent when only one layer is faulty.

## History cache

`history_cache:` is isolated from latest/archive and may remain inert after code rollback. Do not delete it by default. If verified cache corruption requires cleanup, export/retain the manifest, remove only enumerated `history_cache:` keys, and never touch latest/archive keys.

## Required validation after rollback

1. `/health`, `/latest` and `/archive` return expected status and identities.
2. Page loads, today autofill and scoring work.
3. Pine Auto engine/Resolver behavior and frozen hashes are correct.
4. If history remains enabled, valid and boundary history requests behave correctly and cannot alter `/latest`.
5. Pages Action and Worker deployment are successful; repository is clean.
6. Record final HTML, Worker, Resolver, Pine config and scoring hashes.
