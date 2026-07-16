# V1.3 Production Cutover Checklist

## Before release

- [ ] Record current deployed Worker version ID and hash.
- [ ] Verify current remote Pages commit; expected rollback is `5c96262`.
- [ ] Confirm Production KV namespace through a secure operator channel.
- [ ] Confirm existing `SNAPSHOT_ADMIN_TOKEN` Secret presence without printing it.
- [x] Candidate Registry enables only `000922`, `930955`.
- [x] KV estimate documented: changed snapshot 2 reads/4 puts; duplicate 1 read/0 puts.
- [ ] Obtain current daily put usage and apply 800 warning / 950 block.
- [ ] Complete successful Candidate `wrangler deploy --dry-run`.
- [x] Complete local V1.3/Pine/KV/History/Desktop/Mobile regression.
- [ ] Obtain formal release approval.

## Release sequence

1. [ ] Deploy isolated Candidate Worker name without Production route.
2. [ ] Complete read-only Candidate acceptance.
3. [ ] Obtain explicit human approval for Production cutover.
4. [ ] Capture rollback Worker version again and switch Production Worker.
5. [ ] Complete Production Worker read-only acceptance.
6. [ ] Merge reviewed branch and publish GitHub Pages.
7. [ ] Complete online desktop and 390×844 acceptance.
8. [ ] Confirm KV audit and close only if all identities/scores/history paths pass.

## Rollback

- [ ] Restore captured Worker version.
- [ ] Create a normal `git revert` rollback commit; no force push.
- [ ] Preserve latest, last-success, dated snapshots and all KV history.
- [ ] Repeat read-only Production acceptance and record incident details.

Current blockers: **WRANGLER_ENVIRONMENT_REQUIRED**, **SECRET_CONFIGURATION_REQUIRED**. No release step is authorized while either remains.
