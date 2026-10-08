# Downloaded extract validation

Reviewed October 7, 2026. Inputs: local `Database/Raw/raw.csv.csv` and `Database/Raw/Codebook.pdf`. Complete CSV scan used pandas in 100,000-row chunks. Summary counters are in `DATA_AUDIT.json`; no respondent records are reproduced here.

| Check | Result |
|---|---|
| CSV columns | 42 |
| Total records | 5,932,982 |
| Samples | 201801, 201901, 202101, 202201, 202301, 202401 |
| Years | 2018, 2019, 2021, 2022, 2023, 2024 |
| Wage-worker restriction | CLASSWKR=2 for every row |
| Citizenship | Code 0 retained: 4,907,574 rows |
| Residence geography | Observed codes are the 50 states plus DC |
| Hours variable | Present; no blank or zero UHRSWORK |
| Person weights | Present; no blank/nonpositive PERWT |
| Eligible age/hours/weeks/class/geography | 5,333,667 rows before income-quality processing |
| Eligible nonpositive wage income | 439 rows; requires explicit treatment |
| Eligible income missing/N/A sentinels | No values at or above 999998 observed |
| Exact weeks | Blank for all 960,213 records in 2018; use WKSWORK2=6 across years |
| Income allocation flag | QINCWAGE absent; cannot stratify errors by this flag |

Eligible rows by year: 2018 867,284; 2019 884,516; 2021 835,992; 2022 904,464; 2023 919,671; 2024 921,740.

The eligibility check used AGE 25–64, UHRSWORK 35–99 inclusive, WKSWORK2=6, CLASSWKR=2, and STATEFIP within 1–56; observed residence codes were separately inspected and are valid state/DC codes. Production preprocessing should use an explicit state-code whitelist. This check is not a full duplicate audit, categorical harmonization, or accuracy evaluation.

## Conclusion

No new extract is needed to start implementation. Filter UHRSWORK locally. QINCWAGE is a quality-analysis feature, not a mandatory population filter; document its absence. The PDF contains usable variable definitions and sample metadata. Native XML/DDI is helpful but not a blocker.

The codebook describes contemporary-dollar INCWAGE, ACS reference-period considerations, and state-specific top coding. Establish the inflation basis before transformation; avoid double adjustment. Review zeros and top-code effects before training exclusions. Use 2024 as the latest held-out year, with separate earlier validation/calibration partitions.

Raw data, PDF, and extracted codebook text are excluded from Git. The PDF includes signed download URLs in browser footers and should remain private. Publish sanitized documentation and disclosure-reviewed artifacts/aggregates only.

The 5.3-million-row eligible population needs chunked processing and bounded/sampled training for the approximately 16 GB laptop. This inspection verifies readiness, not model performance.
