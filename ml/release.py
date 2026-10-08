"""Measured model release gates, separate from the exploratory demo."""

import hashlib
import json
import math
from pathlib import Path


def fingerprint(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def evaluate_release(bundle):
    reasons = []
    for variant in ("career", "demographic"):
        metric = bundle["metrics"][variant]
        if not all(math.isfinite(metric[key]) for key in ("mae", "coverage", "maeImprovement")):
            reasons.append(f"{variant}: nonfinite metric")
        if metric["maeImprovement"] < 0.10:
            reasons.append(f"{variant}: MAE improvement below 10%")
        if not 0.77 <= metric["coverage"] <= 0.83:
            reasons.append(f"{variant}: overall coverage outside 77–83%")
    subgroup_review = [
        f"{variant}/{name}"
        for variant in ("career", "demographic")
        for name, metric in bundle["provenance"].get(variant + "Subgroups", {}).items()
        if metric["effectiveN"] >= 100 and not 0.77 <= metric["coverage"] <= 0.83
    ]
    return {
        "qualityApproved": not reasons and not subgroup_review,
        "reasons": reasons,
        "subgroupReviewRequired": subgroup_review,
        "version": bundle["version"],
        "status": "candidate",
    }


def inspect_bundle(path):
    bundle = json.loads(Path(path).read_text(encoding="utf-8"))
    for variant in ("career", "demographic"):
        model = bundle["variants"][variant]
        if len(model["forests"]) != 3 or not all(forest["trees"] for forest in model["forests"]):
            raise ValueError("Incomplete quantile artifact")
    return bundle
