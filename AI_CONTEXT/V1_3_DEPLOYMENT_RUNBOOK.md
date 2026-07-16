# V1.3 Deployment Runbook

This runbook is inert documentation. It grants no deployment or Secret authority.

## Phase 0 — approval prerequisites

1. Verify branch review and a clean, scoped release commit; never use `git add .`.
2. Record current Pages remote commit and confirm expected rollback `5c96262`.
3. Record current deployed Worker version ID, source/config hash and health output.
4. Confirm Production namespace binding through a secure operator channel.
5. Confirm the existing `SNAPSHOT_ADMIN_TOKEN` Secret is present without printing it.
6. Generate the KV estimate and independently obtain the current daily put usage.
7. Block at projected puts `>=950`; record warning at `>=800`.
8. Securely render the namespace placeholder into an untracked Candidate config.
9. Run `wrangler deploy --dry-run`; archive bundle metadata and verify no route/Cron/temporary binding/Secret value.

## Phase 1 — isolated Candidate Worker

Requires explicit human approval. Deploy only the isolated name `dividend-dashboard-api-v1-3-production-candidate`. Do not use a Production route and do not invoke snapshot PUT. Run read-only health, indices, latest, Pine, history boundaries, archive and two-index identity acceptance.

## Phase 2 — Production Worker cutover

Requires a second explicit human approval after isolated acceptance. Pause scheduled mutation for the release window, capture the rollback version again, render the formally named config, and perform one Worker cutover. Do not refresh snapshot and do not write KV as a deployment workaround.

## Phase 3 — Pages release

After Worker online acceptance, merge the reviewed feature branch through the normal repository workflow. Publish the reviewed Pages commit only; do not make direct main edits, empty commits or force pushes.

## Phase 4 — online acceptance

Verify both indices, atomic switching, unknown search, Python Auto date/engine, Override/restore, historical normal/weekend/missing/insufficient responses, 60/40 scoring, final clamp, desktop Console and 390×844 layout. Confirm Cloudflare audit shows no unexpected writes.

## Rollback

Restore the captured pre-cutover Worker version. Revert the V1.3 release commit with `git revert` and publish that normal rollback commit. Keep latest, last-success, dated snapshots, history index and all `history_cache:` keys. Never force push or delete KV history.
