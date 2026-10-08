"""Dependency-light reference evaluator for the browser model."""

import math
import struct


def forest_predict(forest, values):
    total = forest["base"]
    for tree in forest["trees"]:
        node = 0
        while tree["left"][node] != -1:
            value = struct.unpack("f", struct.pack("f", values[tree["feature"][node]]))[0]
            if math.isnan(value):
                node = tree["left"][node] if tree["defaultLeft"][node] else tree["right"][node]
            else:
                node = (
                    tree["left"][node] if value < tree["threshold"][node] else tree["right"][node]
                )
        total += tree["threshold"][node]
    return total


def predict(bundle, profile, variant="career", year=None):
    model = bundle["variants"][variant]
    year = year or bundle["baseYear"]
    values = [
        profile[f] if f == "AGE" else model["maps"][f].get(str(profile[f]), model["fallback"])
        for f in model["features"]
    ]
    q = sorted(forest_predict(forest, values) for forest in model["forests"])
    factor = bundle["inflation"][str(year)]
    return {
        "estimate": math.exp(q[1]) * factor,
        "lower": math.exp(q[0] - model["calibration"]) * factor,
        "upper": math.exp(q[2] + model["calibration"]) * factor,
        "year": year,
        "modelVersion": bundle["version"],
        "variant": variant,
    }
