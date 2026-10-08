# Learn WageInsight by following one profile

## Frontend and concurrency

Start `pnpm --dir client start`. Read App.tsx, predict.worker.ts and inference.ts in that order. Change age while a prediction is running: request IDs discard stale replies. Guest profiles never enter storage. AgeChart.tsx demonstrates dynamic imports so the initial page skips the chart library. Read the Playwright tests to see how exports, mobile layout and reload privacy are verified.

Exercise: add a comparison label or keyboard shortcut, then extend a user-flow test. Keep profile edits and displayed result snapshots consistent.

## API and data ownership

Run `.venv/Scripts/python.exe -m uvicorn server.app:app --host 127.0.0.1 --port 8000` and inspect /docs. Compare its numbers against browser inference. Follow auth.ts and migrations 001/002: identity belongs to Supabase Auth; RLS owns authorization, even if a browser forges user_id. Save/Delete callbacks avoid displaying another account's late response.

Exercise: use two existing test accounts to prove one cannot read/delete the other's row. Inspect why a client-only ownership check would be insufficient.

## Grounded generation

Read shared/explanations.ts, shared/personalized.ts and worker/src/index.ts. The distinction matters: model-derived dollar comparisons are computed; prose is generated. Source IDs/links come from an allowlist, not the model. Invalid JSON, invented amounts, incompatible citations and some unsafe claims produce a fallback. Semantic correctness still requires evaluation.

Exercise: run `pnpm --dir client test`, then add an adversarial example to personalized.test.ts. Compare a faithful paraphrase with an unsupported causal explanation. Inspect canonical citations in the UI after a real verified request.

## ML, orchestration and tracking

Install `.venv/Scripts/python.exe -m pip install -r requirements-mlops.txt`. Prefect is pinned to a version compatible with the reference API; MLflow is local.

Record the existing evaluated model and verify restored extract lineage:
```powershell
./.venv/Scripts/python.exe -m ml.pipeline --data Database/Raw/Raw.csv
./.venv/Scripts/mlflow.exe ui --backend-store-uri sqlite:///.cache/mlflow.db --host 127.0.0.1 --port 5001 --workers 1
```

Open localhost:5001, select wageinsight, and inspect parameters, MAE/coverage and model/evaluation/release artifacts. The flow leaves its summary in .cache/release.json. Raw rows are never MLflow artifacts.

Train a bounded candidate, not the public model:
```powershell
./.venv/Scripts/python.exe -m ml.pipeline --train --data Database/Raw/Raw.csv --cap 20000
```

Read data.py for weighted sampling, train.py for fold-local target encoding and quantile calibration, and release.py for measurable gates. Inspect why overall interval coverage can conceal subgroup failure. The current career model fails the MAE gate; do not tune against the already examined 2024 test results.

## Deployment and engineering evidence

Follow DEPLOYMENT.md. CI checks builds, API/data contracts, portable parity, browser flows and Worker packaging. Dry runs need no deployment credentials. Trace/log outcome metrics distinguish verification, limits, provider failure and fallback without logging private context.

Docker demonstrates packaging for the optional API; run it when a local Docker engine is available. The portfolio architecture does not need a paid always-on API.

A defensible resume describes what you actually built and measured: local browser inference, authenticated owned history, source-grounded generation with validation/fallback, chronological survey-weighted ML, and an orchestrated tracked lifecycle. Treat dbt/BI, state purchasing power and model improvements as future exercises rather than completed skills.
