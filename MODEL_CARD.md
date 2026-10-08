# WageInsight initial model card

## Population and objective

US states/DC, ages 25–64, wage workers, usual hours >=35 and weeks category 50–52. Positive annual wage income only. Target is log previous-12-month INCWAGE converted to 2024 dollars with CPI99. This is an income proxy, not contractual salary. Retirement/current-employment restrictions are not added; the work reference period defines eligibility.

## Data and splits

Six ACS 1-year samples: 2018, 2019, 2021, 2022, 2023, 2024. Approximately 5.33 million eligible positive-income records; deterministic sample of 20,000 per year. Training: 60,000; validation, calibration, test: 20,000 each. Weights are PERWT adjusted for year-specific sampling fractions. Stable person hashes select the bounded sample; household hashes isolate training target-encoding folds. Household identifiers do not establish person identity across annual ACS samples.

## Estimators

Career model: age, occupation, industry, detailed education, bachelor's field, residence state. Demographic variant additionally includes survey sex, race, Hispanic origin, marital status, citizenship, English proficiency, and veteran status. Binary variables are not reversed or collapsed silently. Category target means are survey-weighted, smoothed, cross-fitted during training, and exported consistently. Rare-category mappings fall back to the global training target mean.

Three XGBoost log-income quantile models per variant (10th/50th/90th); histogram training, depth four, at most 160 iterations, two threads, validation-based early stopping. Hold-out 2023 weighted residual calibration expands the range. Empirical coverage does not imply a distribution-free guarantee under temporal drift, unequal survey weights, or within-household dependence.

## Evaluation in 2024 dollars

| Model | Weighted MAE | Dollar RMSE | Dollar R² | Interval coverage |
|---|---:|---:|---:|---:|
| Cohort median + occupation fallback | $36,798 | $75,114 | 0.211 | — |
| Career linear | $34,482 | $71,422 | 0.287 | — |
| Career XGBoost | $33,756 | $70,005 | 0.315 | 79.9% |
| Demographic linear | $33,645 | $70,311 | 0.309 | — |
| Demographic XGBoost | $32,922 | $68,892 | 0.337 | 80.1% |

MAE improvement over the declared baseline: 8.3% career and 10.5% demographic. Career does not meet the proposed 10% improvement gate. Average interval widths are $98,115 and $95,806; wide uncertainty is material, not a cosmetic issue. See MODEL_REPORT.json for subgroup MAE, coverage, effective sample sizes, and exact metrics. Racial subgroup coverage varies; some samples have low effective N. Overall calibration should not be portrayed as uniformly calibrated for every group.

## Explanations and limitations

UI feature changes compare a selected category with the most common training category while holding other inputs fixed. They are individual scenario deltas, not additive SHAP contributions or causal wage-gap estimates. Such profiles can be implausible. Occupation peer summaries are weighted training-period aggregates, not adjusted demographic comparisons. Race/sex historical patterns should not be used to determine a person's worth or prescribe compensation.

Top coding, self-reporting/allocation, absent QINCWAGE, industry-code revisions, no measured experience, limited geographic detail, and sample-restricted rare categories limit interpretation. Models cannot forecast future promotions or the payoff from switching majors. A calendar-year choice converts the dollar basis of the same estimated distribution; it does not learn that year's labor market. Cost-of-living differences among states remain unimplemented.

Portable JSON was checked against native XGBoost on 100 test rows per estimator. Browser/Python parity tests use synthetic reference-category profiles, not respondent rows. Artifact is about 658 KB before compression. Reproducibility records include raw-data SHA256 and split/sampling settings. No production latency benchmark or external auth/AI validation is claimed.
