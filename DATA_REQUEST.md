# Data needed before final model training

**Status:** The new extract and PDF codebook have arrived in `Database/Raw`. The complete scan is documented in `DATA_AUDIT.md`. UHRSWORK is present and will be filtered locally; QINCWAGE is absent and will be documented as a limitation. Native XML/DDI is optional for starting implementation. The requirements below describe the requested extract, not a remaining request to download it again.

The supplied raw.csv lacks year, survey weights, hours, weeks, and extract metadata. Its full-time status and inflation basis cannot be reconstructed reliably. Preserve it for provisional development; obtain a new extract for final evaluation.

## Requested IPUMS USA extract

- Standard ACS **1-year** samples for 2018, 2019, and 2021–2024; include 2025 if the standard 1-year sample is available through IPUMS. Do not mix overlapping ACS 5-year files into this extract. Exclude 2020 initially because of its unusual survey conditions; document this gap.
- All US states plus DC. Ages 25–64. Keep records needed to identify wage/salary workers; apply final full-time/employment filters in the reproducible pipeline. No arbitrary $15k minimum or $500k maximum.
- Full eligible extracts are preferred: disk size is acceptable, training will use chunking and deterministic sampling. If download/storage limits require sampling, discuss a documented probability sample with weights before reducing it. Start laptop tuning at 100k–250k records; this is a compute strategy, not a proposed final data population.
- Include the IPUMS CSV plus the extract XML/DDI/codebook and sample-selection summary. Availability and codes must be checked for each chosen year.

## Variables

| Purpose | Request |
|---|---|
| Provenance, grouping, weights | YEAR, SAMPLE, SERIAL, PERNUM, PERWT; STRATA/CLUSTER if available and relevant |
| Income and adjustment | INCWAGE, CPI99; retain supplied ACS income-adjustment/source fields if available, plus documentation of existing adjustment conventions |
| Full-time population | UHRSWORK, WKSWORK1 where available, WKSWORK2, EMPSTAT/EMPSTATD, CLASSWKR/CLASSWKRD, LABFORCE |
| Demographics | AGE, SEX, RACE/RACED, HISPAN/HISPAND, MARST, CITIZEN, SPEAKENG, VETSTAT/VETSTATD |
| Education | EDUC/EDUCD, DEGFIELD/DEGFIELDD, DEGFIELD2/DEGFIELD2D |
| Profession | OCC and IND; OCC2010 and IND1990 harmonized variables if available for the selected samples |
| Geography | STATEFIP for residence, PWSTATE2 for workplace; METRO and a consistent public metro identifier if available |
| Quality indicators | Income allocation flag such as QINCWAGE, and relevant education/occupation allocation flags if available |

Minimum blocking additions: year/sample, weights, hours, weeks, residence state, and extract codebook. Exact variables are subject to IPUMS availability; preserve unavailable values explicitly.

## Confirmed population definition

### Extract-selection corrections from screenshot review

- AGE 25–64, UHRSWORK 35–99 inclusive (99 is a valid top code), WKSWORK2=6 (50–52 weeks), CLASSWKR=2 (wage workers).
- Do not restrict DEGFIELD or DEGFIELD2 to non-N/A values. Retain people without a bachelor's degree and people without a second degree field.
- Retain CITIZEN=0: in ACS this includes US-born people, not merely missing observations. Keep the full variable and recode using the sample-specific codebook.
- Retain EDUC=0 for review: the combined label includes no schooling. Export EDUCD to distinguish categories.
- Restrict residence STATEFIP to the 50 states plus DC. Keep all PWSTATE2 codes at extraction and handle unknown/outside-US workplace explicitly later.
- Prefer keeping unknown demographic/metro categories until documented preprocessing rather than imposing blanket complete-case extraction.
- EMPSTAT=1 and LABFORCE=2 are acceptable only if the intended population also requires current employment. Those statuses describe current/reference-week employment, while hours/weeks/income describe the prior year or prior 12 months. Preserve these variables without extraction restrictions if using the broader year-round worker population.
- Ensure detailed EDUC/DEGFIELD/DEGFIELD2/RACE/HISPAN variants and harmonized occupation/industry variables are included where available. Confirm selected ACS 1-year samples separately; screenshots of variable selection do not establish the sample years.

Full-time year-round wage/salary workers, ages 25–64: usual hours at least 35 per week and at least 50 weeks worked. With WKSWORK2 use the documented 50–52-week category; do not invent exact weeks inside its categories. Exclude self-employed earnings from the wage-salary target and handle N/A, zero earnings, and top codes explicitly.

INCWAGE measures wage/salary income over a reference period, not contractual base salary. Benefits, actual years of experience, and future career progression are not measured by these requested variables.

## What the user must supply

1. Create/download the IPUMS extract through their account and place the CSV and codebook in a local folder; send the path. Do not commit microdata to Git or upload it to public hosting.
2. Include the extract terms and selection metadata so the implementation can review publication conditions for trained artifacts and aggregate summaries before release.

The assistant can fetch public BLS inflation and BEA regional-price series, build the SQL/Parquet pipeline, train/evaluate locally, and document the transformations. The user does not need to recreate CSC498.db.
