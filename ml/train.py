"""Bounded laptop training, chronological evaluation, portable tree export."""

import argparse
import csv
import hashlib
import json
import re
import time
import platform
import importlib.metadata
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
from ml.data import CAREER, DEMOGRAPHIC, prepare, weighted_quantile
from server.runtime import forest_predict
from ml.release import fingerprint

ROOT = Path(__file__).parents[1]


def mapping(frame, field):
    data = (
        frame.assign(_sum=frame._target * frame._w)
        .groupby(field)
        .agg(n=("_target", "size"), w=("_w", "sum"), total=("_sum", "sum"))
    )
    mean = float(np.average(frame._target, weights=frame._w))
    return {
        str(int(k)): float((r.total + 20 * mean) / (r.w + 20)) if r.n >= 25 else mean
        for k, r in data.iterrows()
    }, mean


def encode(frame, features, maps, mean):
    return np.column_stack(
        [
            frame[f].to_numpy()
            if f == "AGE"
            else frame[f].astype(int).astype(str).map(maps[f]).fillna(mean).to_numpy()
            for f in features
        ]
    ).astype(np.float32)


def crossfit(frame, features):
    maps = {}
    mean = float(np.average(frame._target, weights=frame._w))
    for f in features:
        if f != "AGE":
            maps[f], _ = mapping(frame, f)
    result = np.empty((len(frame), len(features)), dtype=np.float32)
    folds = pd.util.hash_pandas_object(frame[["SAMPLE", "SERIAL"]], index=False).to_numpy() % 3
    for fold in range(3):
        fit = frame.loc[folds != fold]
        local = {f: mapping(fit, f)[0] for f in features if f != "AGE"}
        result[folds == fold] = encode(
            frame.loc[folds == fold],
            features,
            local,
            float(np.average(fit._target, weights=fit._w)),
        )
    return result, maps, mean


def export_model(model):
    raw = json.loads(model.get_booster().save_raw(raw_format="json"))
    learner = raw["learner"]
    base = float(learner["learner_model_param"]["base_score"].strip("[]"))
    trees = learner["gradient_booster"]["model"]["trees"]
    return {
        "base": base,
        "trees": [
            {
                "left": t["left_children"],
                "right": t["right_children"],
                "feature": t["split_indices"],
                "threshold": t["split_conditions"],
                "defaultLeft": t["default_left"],
            }
            for t in trees
        ],
    }


def metrics(y, p, w):
    return {
        "mae": float(mean_absolute_error(y, p, sample_weight=w)),
        "rmse": float(np.sqrt(mean_squared_error(y, p, sample_weight=w))),
        "r2": float(r2_score(y, p, sample_weight=w)),
    }


def labels():
    maps = {}
    # Sanitized public category labels make training independent of private PDF text.
    sanitized = ROOT / "ml/category-labels.json"
    if sanitized.exists():
        maps = {
            field: {int(k): v for k, v in values.items()}
            for field, values in json.loads(sanitized.read_text(encoding="utf-8")).items()
        }
    # General categories from checked-in dictionaries; occupation labels refreshed below.
    for field, file, id_col, label_col in [
        ("OCC", "occupation.csv", "OCCID", "OCC"),
        ("IND", "industry.csv", "INDID", "IND"),
        ("DEGFIELD", "degree.csv", "DEGFIELDID", "DEGFIELD"),
        ("STATEFIP", "state.csv", "PWSTATE2", "WORKSTATE"),
    ]:
        with (ROOT / "Database" / file).open(encoding="utf-8-sig") as fp:
            maps[field] = {
                int(r[id_col]): r[label_col] for r in csv.DictReader(fp) if r[id_col].isdigit()
            }
    codebook = ROOT / "Database/Raw/codebook-extracted.txt"
    if codebook.exists():
        text = codebook.read_text(encoding="utf-8")
        for field in ["EDUCD", "SEX", "RACE", "HISPAN", "MARST", "CITIZEN", "SPEAKENG", "VETSTAT"]:
            section = text.split('Variable: "' + field + '"')[-1].split('Variable: "')[0]
            table = section.split("Categories")[-1].split("Notes")[0]
            maps[field] = {
                int(m[1]): m[2].strip()
                for line in table.splitlines()
                if (m := re.match(r"^([0-9]+) (.+)$", line))
            }
    if (ROOT / "ml/occupation-labels.json").exists():
        maps["OCC"].update(
            {
                int(k): v
                for k, v in json.loads((ROOT / "ml/occupation-labels.json").read_text()).items()
            }
        )
    maps.setdefault("CITIZEN", {})[0] = "US-born / citizen at birth"
    maps["DEGFIELD"][0] = "No bachelor’s degree / no applicable field"
    return maps


def run(args):
    start = time.time()
    source = Path(args.data)
    if args.cap < 1000:
        raise ValueError("Use at least 1000 sampled records per year")
    digest = hashlib.sha256()
    with source.open("rb") as fp:
        while chunk := fp.read(1024 * 1024):
            digest.update(chunk)
    cache = ROOT / ".cache"
    cache.mkdir(exist_ok=True)
    preprocessing = fingerprint(ROOT / "ml/data.py")
    key = (
        digest.hexdigest()[:16]
        + "-"
        + str(args.cap)
        + "-"
        + preprocessing[:8]
        + "-pandas"
        + pd.__version__
    )
    parquet = cache / (key + ".parquet")
    metadata = cache / (key + ".json")
    if parquet.exists() and metadata.exists():
        frame = pd.read_parquet(parquet)
        saved = json.loads(metadata.read_text())
        counts = saved["counts"]
        cpi = {int(k): v for k, v in saved["cpi"].items()}
    else:
        frame, counts, cpi = prepare(source, args.cap)
        frame.to_parquet(parquet, index=False)
        metadata.write_text(json.dumps({"counts": counts, "cpi": cpi}))
    partitions = {
        "train": frame[frame.YEAR <= 2021].copy(),
        "validation": frame[frame.YEAR == 2022].copy(),
        "calibration": frame[frame.YEAR == 2023].copy(),
        "test": frame[frame.YEAR == 2024].copy(),
    }
    for part in partitions.values():
        part["_target"] = np.log(part.income)
        part["_w"] = part.weight / part.weight.mean()
    train = partitions["train"]
    test = partitions["test"]
    labelmap = labels()
    bundle = {
        "version": f"acs-2024-v2-{digest.hexdigest()[:8]}-n{args.cap}-{fingerprint(Path(__file__))[:8]}",
        "baseYear": 2024,
        "inflation": {str(y): cpi[2024] / cpi[y] for y in cpi},
        "options": {},
        "variants": {},
        "metrics": {},
        "provenance": {
            "datasetSha256": digest.hexdigest(),
            "trainingCodeSha256": fingerprint(Path(__file__)),
            "preprocessingSha256": preprocessing,
            "labelDictionarySha256": fingerprint(ROOT / "ml/category-labels.json"),
            "environment": {
                "python": platform.python_version(),
                **{
                    name: importlib.metadata.version(name)
                    for name in ("numpy", "pandas", "scikit-learn", "xgboost")
                },
            },
            "eligibleCounts": counts,
            "sampleCapPerYear": args.cap,
            "split": {k: len(v) for k, v in partitions.items()},
            "target": "positive wage income; full-time year-round wage workers",
            "limitations": [
                "Historical associations, not causation or career forecasts",
                "Unweighted counts constrain rare-category encoding; weighted target means",
                "QINCWAGE unavailable",
                "No actual years of experience",
                "Income is top-coded",
                "Time inflation conversion is not a current labor-market update",
            ],
        },
    }
    for field in DEMOGRAPHIC:
        if field == "AGE":
            continue
        bundle["options"][field] = [
            {
                "value": int(v),
                "label": labelmap.get(field, {}).get(int(v), f"{field} code {int(v)}"),
            }
            for v in sorted(train[field].unique())
        ]
    globalmedian = weighted_quantile(train.income, train.weight, 0.5)
    bundle["peers"] = {}
    for occupation, group in train.groupby("OCC"):
        if len(group) >= 100:
            bundle["peers"][str(int(occupation))] = {
                "n": len(group),
                "median": weighted_quantile(group.income, group.weight, 0.5),
                "lower": weighted_quantile(group.income, group.weight, 0.1),
                "upper": weighted_quantile(group.income, group.weight, 0.9),
            }
    cohort = {}
    occupation_medians = {
        key: weighted_quantile(group.income, group.weight, 0.5)
        for key, group in train.groupby("OCC")
        if len(group) >= 30
    }
    for key, group in train.groupby(["OCC", "STATEFIP", "EDUCD"]):
        if len(group) >= 30:
            cohort[key] = weighted_quantile(group.income, group.weight, 0.5)
    baseline = np.array(
        [
            cohort.get(tuple(row), occupation_medians.get(row[0], globalmedian))
            for row in test[["OCC", "STATEFIP", "EDUCD"]].to_numpy()
        ]
    )
    bundle["metrics"]["cohortBaseline"] = metrics(test.income, baseline, test.weight)
    for name, features in [("career", CAREER), ("demographic", DEMOGRAPHIC)]:
        print("Training", name, flush=True)
        x, maps, mean = crossfit(train, features)
        models = []
        forests = []
        validation = partitions["validation"]
        xv = encode(validation, features, maps, mean)
        for alpha in [0.1, 0.5, 0.9]:
            model = XGBRegressor(
                objective="reg:quantileerror",
                quantile_alpha=alpha,
                n_estimators=160,
                max_depth=4,
                learning_rate=0.06,
                min_child_weight=30,
                tree_method="hist",
                n_jobs=2,
                random_state=42,
                early_stopping_rounds=15,
            )
            model.fit(
                x,
                train._target,
                sample_weight=train._w,
                eval_set=[(xv, validation._target)],
                sample_weight_eval_set=[validation._w],
                verbose=False,
            )
            # Export only the selected iterations, matching model.predict.
            model._Booster = model.get_booster()[: model.best_iteration + 1]
            models.append(model)
            forests.append(export_model(model))
        cal = partitions["calibration"]
        xc = encode(cal, features, maps, mean)
        qc = np.sort(np.column_stack([m.predict(xc) for m in models]), axis=1)
        scores = np.maximum(qc[:, 0] - cal._target, cal._target - qc[:, 2])
        correction = max(0, weighted_quantile(scores, cal.weight, 0.8))
        xt = encode(test, features, maps, mean)
        q = np.sort(np.column_stack([m.predict(xt) for m in models]), axis=1)
        for forest, model in zip(forests, models):
            portable = np.array([forest_predict(forest, row) for row in xt[:100]])
            if not np.allclose(portable, model.predict(xt[:100]), atol=2e-5):
                raise ValueError("Portable export parity failed")
        estimate = np.exp(q[:, 1])
        lower = np.exp(q[:, 0] - correction)
        upper = np.exp(q[:, 2] + correction)
        report = metrics(test.income, estimate, test.weight)
        report.update(
            coverage=float(
                np.average((test.income >= lower) & (test.income <= upper), weights=test.weight)
            ),
            meanWidth=float(np.average(upper - lower, weights=test.weight)),
            maeImprovement=1 - report["mae"] / bundle["metrics"]["cohortBaseline"]["mae"],
        )
        bundle["metrics"][name] = report
        subgroup = {}
        for field in ["SEX", "RACE"]:
            for code, group in test.groupby(field):
                mask = test[field].eq(code).to_numpy()
                if len(group) < 100:
                    continue
                subgroup[f"{field}:{int(code)}"] = {
                    "n": len(group),
                    "effectiveN": float(group.weight.sum() ** 2 / (group.weight**2).sum()),
                    "mae": float(
                        np.average(
                            np.abs(group.income.to_numpy() - estimate[mask]), weights=group.weight
                        )
                    ),
                    "coverage": float(
                        np.average(
                            (group.income.to_numpy() >= lower[mask])
                            & (group.income.to_numpy() <= upper[mask]),
                            weights=group.weight,
                        )
                    ),
                }
        bundle["provenance"][name + "Subgroups"] = subgroup
        ridge = Ridge(alpha=10).fit(x, train._target, sample_weight=train._w)
        bundle["metrics"][name + "Linear"] = metrics(
            test.income, np.exp(ridge.predict(xt)), test.weight
        )
        reference = {f: int(train[f].mode().iloc[0]) for f in features}
        reference["AGE"] = 40
        bundle["variants"][name] = {
            "features": features,
            "maps": maps,
            "fallback": mean,
            "forests": forests,
            "calibration": correction,
            "reference": reference,
        }
        print(json.dumps(report), flush=True)
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    (out / "bundle.json").write_text(
        json.dumps(bundle, separators=(",", ":"), allow_nan=False), encoding="utf-8"
    )
    summary = {
        "version": bundle["version"],
        "metrics": bundle["metrics"],
        "provenance": bundle["provenance"],
        "seconds": round(time.time() - start, 2),
    }
    (out / "MODEL_REPORT.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("Bundle bytes:", (out / "bundle.json").stat().st_size, flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default=str(ROOT / "Database/Raw/Raw.csv"))
    parser.add_argument("--cap", type=int, default=20000)
    parser.add_argument("--output", default=str(ROOT / ".cache/candidate"))
    run(parser.parse_args())
