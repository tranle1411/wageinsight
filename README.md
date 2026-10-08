# WageInsight

Explore how education, profession, location, and optional demographics relate to US full-time annual wage income. Built by [Tran Le](https://github.com/tranle1411/wageinsight).

## Working implementation

- React + TypeScript + Vite; responsive profile form with occupation/industry search.
- A Web Worker predicts locally from a compact, versioned XGBoost tree bundle. Guest profiles and comparisons remain in memory; JSON exports are explicitly downloaded.
- Median estimate, calibrated approximate 80% income range, individual model associations, weighted occupation peer statistics, age scenarios, up to four profile comparisons, and collapsible explanations.
- Two models: career/location/education and optional demographic exploration. Changing dollar year converts purchasing power over time; it does not forecast the labor market.
- FastAPI/Pydantic local reference API with CORS, request-size limits, startup model loading, readiness, safe latency logs, and OpenAPI documentation.
- Supabase integration for OAuth, email/password verification, password recovery, explicit Save/Delete, and owner-only PostgreSQL history. All login methods are live according to Tran Le; new changes still need deployment checks.
- Cloudflare Workers AI personalized research commentary, with Turnstile, request limits, canonical citations, output checks and curated fallback. Numeric salary explanations remain local.
- Chunked pandas/Parquet preparation, chronological splits, household-fold cross-fitted weighted target encoding, quantile regression, held-out calibration, native/export parity checks, linear/cohort baselines, and subgroup error reporting.
- Local Prefect lifecycle and MLflow experiment/artifact tracking with release quality gates.
- pytest, Vitest, Playwright desktop/mobile checks, both Worker package checks, Docker reference deployment, and GitHub Actions CI.

## Run locally

Python 3.12 and Node 24 with pnpm 11.19.0:

~~~powershell
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
pnpm --dir client install --frozen-lockfile
pnpm --dir client start
~~~

Open http://127.0.0.1:5173. The checked-in public bundle allows guest use without Python or raw data. The local API is optional:

~~~powershell
./.venv/Scripts/python.exe -m uvicorn server.app:app --host 127.0.0.1 --port 8000
~~~

Open http://127.0.0.1:8000/docs. On Linux/macOS use .venv/bin/python instead of the Windows executable path.

## Reproduce training

Place the private extract at Database/Raw/Raw.csv. Sanitized category-label dictionaries are checked in; inspect labels for new classifications. Raw files and extracted metadata stay outside Git; keep a separate backup because fresh checkouts and cleanup commands can omit or remove ignored files.

~~~powershell
./.venv/Scripts/python.exe -m ml.train --cap 20000
~~~

20,000 sampled records per year; 60,000 training rows across 2018/2019/2021, validation 2022, calibration 2023, test 2024. Positive wage income only; ages 25–64, at least 35 usual hours/week, 50–52 weeks/year, wage workers, states/DC. The sampler uses stable hashes and corrects survey weights for within-year sampling fractions. It does not impose the old $15k–$500k wage restriction. CPI99 normalizes income to 2024 dollars; original price factors are retained for supported display years.

The first scan is cached privately in .cache. Training uses two CPU threads, depth-four trees, early stopping, and no unbounded grid search. New training outputs: .cache/candidate/bundle.json and .cache/candidate/MODEL_REPORT.json. Training does not replace the published model. Use --output for an explicit destination. Small categories use a global fallback; published occupation summaries require at least 100 sampled training records.

Occupation labels: https://usa.ipums.org/usa/volii/occ2018.shtml. Current industry labels use the existing dictionary; unrecognized values are explicitly shown as codes. Revisions to classifications remain a limitation.

## Measured results

On a 20,000-record held-out 2024 sample, weighted dollar MAE is $36,798 for the occupation/state/education cohort baseline with occupation fallback, $33,756 for career XGBoost, and $32,922 for demographic XGBoost. Improvements are 8.3% and 10.5%, respectively. Dollar R²: 0.315 and 0.337. Estimated 80% interval coverage: 79.9% and 80.1%. Mean interval widths remain approximately $98k and $96k.

The career model does not meet the proposed 10% baseline-improvement gate. Individual forecasts remain imprecise. Full metrics, subgroup effective sample sizes, dataset fingerprint, and split sizes are in MODEL_REPORT.json and MODEL_CARD.md. These differ from the historical README's unverified scores; do not compare incompatible evaluation protocols.

## Verify

~~~powershell
./.venv/Scripts/python.exe -m pytest tests -q
pnpm --dir client test
pnpm --dir client build
pnpm --dir client exec playwright install chromium
pnpm --dir client exec playwright test
~~~

CI verifies the public bundle without access to private microdata. Native XGBoost versus portable export is checked during training; Vitest compares TypeScript against Python synthetic-profile fixtures. Refresh fixtures when the numeric model changes.

## Local experiment lifecycle

Install requirements-mlops.txt, then run `python -m ml.pipeline --data Database/Raw/Raw.csv` to verify extract lineage and log the existing bundle, metrics and gates to local MLflow. Add --train to create a bounded candidate. See LEARNING_GUIDE.md. No private respondent records are logged, and no model is automatically promoted.

## Deployment and accounts

See DEPLOYMENT.md. Guest frontend is a static deployment; no sleeping API is required. Do not expose server-side credentials as VITE variables. Supabase's publishable/anon key is intentionally public, secured by row-level security.

The frontend is deployed on Cloudflare Workers Static Assets; Tran Le confirms all login methods are live. This revision and history-limit migration need deployment verification. Docker configuration is provided but has not been run here. Power BI, dbt and state purchasing-power adjustment remain optional future work. See LEARNING_GUIDE.md for hands-on exercises and the Prefect/MLflow commands.

## Data and interpretation

Data: IPUMS USA Version 16.0, https://doi.org/10.18128/D010.V16.0. The PDF codebook is private because printed footers contain signed download URLs. Follow IPUMS citation and publication conditions; do not redistribute respondent records.

INCWAGE represents previous-12-month wage income, not contractual salary, benefits, or self-employed income. Age/education comparisons and demographic associations are not causal estimates. Degree field is the bachelor's field, even for advanced-degree holders. Actual experience is unavailable. State purchasing-power comparisons using BEA RPP are planned but not yet implemented; time inflation conversion is implemented.

Historical notebook/SQL and legacy model artifacts remain as research references. The new application does not use their encodings or pickles. Architecture decisions: ARCHITECTURE.md. Extract validation: DATA_AUDIT.md.
