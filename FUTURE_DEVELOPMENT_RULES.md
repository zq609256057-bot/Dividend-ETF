# Dividend Dashboard Development Rules After V1.2 Freeze

## Mandatory workflow

All work starts from the V1.2 baseline and follows:

```text
feature branch → implementation → automated tests → shadow validation → review → release → production verification
```

Direct edits to production HTML, Worker, `scoring_rules`, Pine, Resolver, valuation/macro logic, technical weights or the 100-point structure are prohibited.

## New indicator

Define source/provenance, unavailable semantics, calculation contract and rollback. Implement outside production, validate in Shadow, run regression/impact tests, receive review, then release explicitly. It must not silently alter existing scores.

## New index

Follow `Registry → data source → latest validation → historical coverage/materialization → UI/score tests → Production`. Add configuration through `code`, `name`, `apiCode`, `enabled`; do not hardcode HTML. Validate insufficient-history and missing-data behavior before enablement.

## Scoring change

Every scoring or weight proposal requires an Impact Report covering old/new scores, 100-point conservation, historical distribution/backtest, representative dates/indices, Pine/valuation/macro interactions, UI compatibility and rollback. Approval produces a new version; it is never folded into V1.2.

## Pine change

Research and production must remain separated. No parameter optimization or reimplementation may replace frozen V7 without explicit model governance, Shadow evidence, Resolver/Static regression and a versioned release.

## Release record

Each release records commit, deployment IDs, Actions status, hashes, test outputs, data coverage, known limitations and rollback point. Stage only intended files; never use `git add .`.
