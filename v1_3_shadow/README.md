# Dividend Dashboard V1.3 Index Management Shadow

This directory is an isolated release candidate. It does not replace `index.html`,
the production Worker, Pine V7, Pine Resolver, scoring weights, valuation logic,
or macro logic.

Routes:

- `GET /indices`: enabled Registry entries only.
- `GET /latest`: canonical snapshot filtered by the enabled Registry.
- `GET /history/calculate?code=<code>&date=YYYY-MM-DD`: Registry-validated history through a read-only Worker Service Binding.
- `GET /api/shadow/pine/latest`: frozen Pine V7 canonical payload, bundled read-only.
- `GET /health`: Shadow identity and health.

Deployment target: `dividend-dashboard-api-v1-3-shadow`. The Wrangler file has
no KV binding. Runtime methods are limited to `GET` and `OPTIONS`; the history
binding only issues `GET`, and the health/Pine contracts report `kvWrites: 0`.

Run local tests from the Git repository root:

```sh
node v1_3_shadow/tests/index_management_test.mjs
node v1_3_shadow/tests/deployment_safety_test.mjs
python3 -m pytest -q v1_3_shadow/tests/test_onboarding.py
```

The onboarding command is read-only and returns `disabled` if any of its eight
gates fails. It never creates or enables an index automatically.
