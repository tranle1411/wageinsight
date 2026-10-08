"""Chunked preparation and deterministic sampling; respondent rows stay private."""

from pathlib import Path
import numpy as np
import pandas as pd

STATES = {
    1,
    2,
    4,
    5,
    6,
    8,
    9,
    10,
    11,
    12,
    13,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51,
    53,
    54,
    55,
    56,
}
CAREER = ["AGE", "OCC", "IND", "EDUCD", "DEGFIELD", "STATEFIP"]
DEMOGRAPHIC = CAREER + ["SEX", "RACE", "HISPAN", "MARST", "CITIZEN", "SPEAKENG", "VETSTAT"]
YEARS = [2018, 2019, 2021, 2022, 2023, 2024]


def eligible(df):
    return (
        df.AGE.between(25, 64)
        & df.UHRSWORK.between(35, 99)
        & df.WKSWORK2.eq(6)
        & df.CLASSWKR.eq(2)
        & df.STATEFIP.isin(STATES)
        & df.INCWAGE.gt(0)
        & df.INCWAGE.lt(999998)
        & df.PERWT.gt(0)
    )


def prepare(path: Path, cap=20000):
    use = DEMOGRAPHIC + [
        "YEAR",
        "SAMPLE",
        "SERIAL",
        "PERNUM",
        "CPI99",
        "PERWT",
        "UHRSWORK",
        "WKSWORK2",
        "CLASSWKR",
        "INCWAGE",
    ]
    samples = {year: pd.DataFrame() for year in YEARS}
    counts = {year: 0 for year in YEARS}
    multipliers = {}
    for i, chunk in enumerate(pd.read_csv(path, usecols=use, chunksize=100000)):
        for year, group in chunk.groupby("YEAR"):
            multipliers[int(year)] = float(group.CPI99.iloc[0])
        chunk = chunk.loc[eligible(chunk)].copy()
        chunk["_priority"] = pd.util.hash_pandas_object(
            chunk[["SAMPLE", "SERIAL", "PERNUM"]], index=False
        ).to_numpy()
        for year, group in chunk.groupby("YEAR"):
            year = int(year)
            if year not in samples:
                continue
            counts[year] += len(group)
            samples[year] = pd.concat(
                [samples[year], group.nsmallest(cap, "_priority")], ignore_index=True
            ).nsmallest(cap, "_priority")
        if i % 10 == 0:
            print(f"Prepared {(i + 1) * 100000:,} input rows", flush=True)
    df = pd.concat(samples.values(), ignore_index=True)
    if not all(len(samples[y]) for y in YEARS):
        raise ValueError("Missing chronological partition.")
    df["income"] = df.INCWAGE * df.CPI99 / multipliers[2024]
    df["weight"] = df.PERWT * df.YEAR.map({y: counts[y] / len(samples[y]) for y in YEARS})
    return df, counts, multipliers


def weighted_quantile(values, weights, q):
    values = np.asarray(values)
    weights = np.asarray(weights)
    order = np.argsort(values)
    return float(
        np.interp(
            q, (np.cumsum(weights[order]) - 0.5 * weights[order]) / weights.sum(), values[order]
        )
    )
