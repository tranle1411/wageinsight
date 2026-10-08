# Project review — 2026-10-08

**Follow-up:** Tran Le confirmed all login methods are live and restored the extract/codebook. The CSV matches the published dataset fingerprint. Personalized cited commentary, history reopening/limits, checked-in frontend deployment, local Prefect/MLflow evidence and release gates are now implemented. Use ARCHITECTURE.md for current implementation; findings below preserve the earlier review snapshot.

Reviewed checkout: `b24d3acc` (clean before review). This records current implementation, not the earlier proposed architecture. No application code or deployed settings were changed during this review.

## Current architecture

1. **Frontend:** React 19, TypeScript, Vite 8, Recharts. Form and session comparisons live in memory. Browser Web Worker loads the public JSON tree bundle; prediction requires no backend. Results include a modeled median, calibrated approximate 80% interval, categorical reference comparisons, weighted occupation peers, age scenarios, and JSON export.
2. **ML:** Private ACS CSV → chunked pandas preparation → private Parquet cache → chronological partitions → weighted household-fold target encoding → three XGBoost log quantiles for each of career and demographic variants → 2023 calibration → 2024 evaluation → portable model/options/aggregates. Train uses 60,000 sampled records; validation/calibration/test each use 20,000. Python and browser tree evaluation have parity fixtures.
3. **Explanations:** Browser creates deterministic, labeled contrasts, omitting incompatible degree/education references. Shared research definitions serve the local panel and the separate Cloudflare Worker. Turnstile Siteverify must confirm success, action `explain`, and exact production hostname. IP and AI rate bindings run before inference. AI selects at most two approved research IDs; the response contains fixed source facts, never generated salary prose. Invalid selections use a curated fallback. This is curated source selection, not live retrieval or a personalized generative narrator.
4. **Accounts:** Supabase client integration, email/password confirmation/recovery, Google/GitHub OAuth, and PostgreSQL history with owner-only select/insert/delete policies. Save is explicit. Actual remote configuration and ownership tests are unknown. History currently lists saved estimates and allows deletion, but does not reopen a complete saved result.
5. **Deployment:** Docs identify the frontend as Workers Static Assets at `wageinsight.chantranle-2026.workers.dev`; the explanation Worker has checked-in Wrangler configuration and production origin. The frontend has no checked-in Wrangler deployment configuration or deployment script. FastAPI is a separate optional local/reference service, with a Dockerfile. CI builds/tests the client and Python but does not package-check the explanation Worker.

## Verification performed

| Check | Result |
|---|---|
| TypeScript and production frontend build | Pass; main JS 502.63 KB / 155.57 KB gzip, chunk warning |
| Vitest inference/parity/explanation tests | 20 pass |
| Playwright guest and interpretation flows | 6 pass across desktop/mobile |
| Playwright mocked Turnstile/AI flows | 4 pass across desktop/mobile |
| Python API and population contracts | 3 pass using available Python |
| Python leakage test | Collection blocked: scikit-learn absent; previous `.venv` absent |
| Explanation Worker dry-run packaging | Pass, expected AI and two rate bindings present |
| Production HTTP smoke test | Could not verify: request returned 403 from this environment; web fetch also failed |
| Real auth, SMTP, Turnstile replay, AI quality | Not independently verified in this review |

`Database/Raw` is absent from this checkout. The published model remains available and functional. No retraining was performed.

## Prioritized next work

1. **Reconcile deployment evidence and configuration.** Record the actual frontend build/deploy commands, build-time variables, production commit/model version, rollback procedure, and successful live checks. README still says no public deployment exists; DEPLOYMENT mixes Pages with Workers; ARCHITECTURE contains superseded plans. Check in the frontend deployment source and add Worker packaging checks to CI. Review traces/structured outcome metrics without logging private request content.
2. **Restore reproducibility before model improvements.** Locate the private extract/codebook and restore pinned Python dependencies. Cache identity currently includes only dataset hash and sample cap, so preprocessing changes can reuse stale cached data. Model version likewise omits training-code/configuration identity. Add those identities and sanitize label dictionaries for reproducible training without private PDF text. Do not tune against the repeatedly inspected 2024 test set; use validation/rolling development partitions and reserve a fresh final evaluation when available.
3. **Improve model quality and support reporting.** Current artifact remains `acs-2024-v1-e0d8d55c-n20000`: career MAE $33,756, 8.3% baseline improvement; demographic MAE $32,922, 10.5%. Career misses the proposed 10% gate. Mean interval widths remain approximately $98k/$96k. Audit subgroup coverage, rare categories and classification drift; benchmark bounded alternatives and sampling sizes. Show support/fallback status rather than equal confidence for every profile. Thirty-seven industry options still have code-only labels.
4. **Make comparisons useful for the primary audience.** Add matched, weighted wage-gap cohorts with uncertainty/support; current occupation peers are broad training-period statistics. Reference categories are independent marginal modes, with bachelor's education but no applicable degree field. Omitting invalid contrasts fixes misleading comparisons but leaves degree-field explanations absent in the standard reference. Use compatible references or explicit paired education/major scenarios. Add reopen/compare/export for saved history.
5. **Complete account validation.** Verify two-user isolation, guest rejection, verification email, recovery and OAuth on the production origin. Bound stored JSON and per-user saved records. Guard save/delete completion against an intervening account switch; the history-fetch effect already has an active-request guard, but mutation callbacks do not.
6. **Evaluate explanation usefulness.** Keep fixed source facts unless the user requests grounded generated prose. Current relevance is chosen from feature presence, including matching reference categories, and fallback source ordering can underrepresent other feature groups. Review relevance with representative education/profession/demographic cases; track fallback rate and latency. The client currently ignores returned source objects and selection method, displaying plain text with IDs; render linked selected citations and identify fallback behavior. Numeric context is still sent to the Worker although it is not supplied to AI or needed for source selection.

## Platform evidence

Cloudflare rate-limit bindings are local to a location and permissive, not a strict global budget: [official rate-limit documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/). The free daily AI allowance resets at 00:00 UTC: [official pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/). Confirm the account remains on Free; account plan was not inspected here.

The BLS education source currently supports the stated 2025/11-month/CPS population caveat: [Education pays](https://www.bls.gov/emp/tables/unemployment-earnings-education.htm). Retrieved the linked BLS women's earnings report, Census degree-field article, and Goldin abstract as primary sources; the linked Census long-term working-paper page could not be retrieved in this review. Source selection tests verify allowed IDs and fixed output, not full scholarly validity or relevance.

## Clarifications pending

- Location of the private extract and codebook.
- Live status of Supabase, OAuth, verification email and saved history.
- Actual Cloudflare build/deploy workflow and real Turnstile/AI success.
- Keep curated source selection or introduce grounded personalized prose.
- Next priority: model/comparisons, account/deployment completion, or explanation UX.
