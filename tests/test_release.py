import copy
import json
from pathlib import Path
from ml.release import evaluate_release


def test_current_demo_cannot_pass_quality_gate():
    bundle = json.loads(Path("client/public/models/bundle.json").read_text())
    gate = evaluate_release(bundle)
    assert not gate["qualityApproved"]
    assert "career: MAE improvement below 10%" in gate["reasons"]


def test_adequate_subgroup_failure_blocks_promotion():
    bundle = copy.deepcopy(json.loads(Path("client/public/models/bundle.json").read_text()))
    for variant in ("career", "demographic"):
        bundle["metrics"][variant].update(maeImprovement=0.12, coverage=0.8)
        bundle["provenance"][variant + "Subgroups"] = {}
    assert evaluate_release(bundle)["qualityApproved"]
    bundle["provenance"]["careerSubgroups"] = {"SEX:2": {"effectiveN": 300, "coverage": 0.70}}
    assert not evaluate_release(bundle)["qualityApproved"]
