# V1.3 Release Checklist

## Completed in release preparation

- [x] Branch is `feature/v1.3-production-release-candidate` based on `5c96262`.
- [x] Production root HTML and named Production Worker were not replaced.
- [x] Registry schema is `dividend_index_registry_v2`.
- [x] Enabled codes are exactly `000922`, `930955`; no real index was added.
- [x] Disabled entries are filtered from `/indices`, `/latest` and Pine.
- [x] Candidate Worker has Production binding name, auth, KV Guard, snapshot and read-only history contracts.
- [x] Candidate config has no Production route, Cron, temporary Shadow binding, or plaintext Secret.
- [x] Candidate HTML supports dropdown, code search, unknown-code rejection and atomic switching.
- [x] Pine priority and frozen 60/40/bonus/clamp scoring rules pass.
- [x] API, Registry, onboarding, Pine, KV, history and mobile candidate tests were run.
- [x] Desktop and 390×844 browser acceptance passed with zero Console errors.
- [x] Preparation KV writes/deletes, snapshot refreshes, deploys and Pages publishes are all zero.
- [x] Rollback target and no-force-push procedure are documented.

## Mandatory gates before any release

- [ ] Review and stage only the candidate/test/report files; exclude `.DS_Store` and unrelated handoff files.
- [ ] Update the authoritative legacy production-history upload test to send KV Guard headers; rerun full suite with zero unexpected failures.
- [ ] Run `wrangler deploy --dry-run` against a securely rendered candidate config.
- [ ] Generate a fresh KV write estimate and independently obtain today's Production put usage.
- [ ] Confirm projected puts are below 950; record warning if at least 800.
- [ ] Confirm the existing Production KV namespace ID through a secure operator channel.
- [ ] Confirm `SNAPSHOT_ADMIN_TOKEN` exists in Wrangler Secret storage; never print it.
- [ ] Capture the currently deployed Production Worker version/config/hash.
- [ ] Obtain explicit human approval for isolated candidate deployment.
- [ ] Run read-only isolated Worker acceptance for both codes and history boundaries.
- [ ] Obtain a second explicit human approval for Production Worker cutover.
- [ ] Confirm release window has no active snapshot refresh or scheduled mutation.
- [ ] Merge via reviewed branch; no direct main edits, empty commits, or force push.
- [ ] Publish GitHub Pages only after Worker acceptance.
- [ ] Run Production desktop and 390×844 acceptance.
- [ ] Close release only if index identity, Pine, scoring, history, Console and KV audit all pass.

Any unchecked item blocks Production release. This checklist does not authorize Secrets, deployment, KV writes, snapshot refresh, or Pages publication.
