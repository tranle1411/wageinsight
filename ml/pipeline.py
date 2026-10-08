"""Local Prefect workflow and MLflow evidence. Never uploads respondent rows."""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from ml.release import evaluate_release, fingerprint, inspect_bundle

ROOT = Path(__file__).resolve().parents[1]
(ROOT / ".cache").mkdir(exist_ok=True)
# Local history only; do not require a Prefect Cloud account or send telemetry.
os.environ.setdefault("PREFECT_HOME", str(ROOT / ".cache/prefect"))
os.environ.setdefault("PREFECT_MEMO_STORE_PATH", str(ROOT / ".cache/prefect/memo_store.toml"))
os.environ.setdefault("PREFECT_SERVER_ANALYTICS_ENABLED", "false")
os.environ.setdefault("PREFECT_LOGGING_LEVEL", "WARNING")
os.environ.setdefault("MLFLOW_ENABLE_TELEMETRY", "false")

# Frameworks read settings at import; configure local storage before loading them.
import mlflow  # noqa: E402
from prefect import flow, task  # noqa: E402


@task(name="verify-extract", retries=0, persist_result=False)
def verify_extract(path, expected=None):
    digest = fingerprint(Path(path))
    if expected and digest != expected:
        raise ValueError("Extract fingerprint does not match the published model")
    return digest


@task(name="train-candidate", retries=0, persist_result=False)
def train_candidate(data, cap):
    destination = ROOT / ".cache/candidate"
    subprocess.run(
        [
            sys.executable,
            "-m",
            "ml.train",
            "--data",
            data,
            "--cap",
            str(cap),
            "--output",
            str(destination),
        ],
        cwd=ROOT,
        check=True,
    )
    return str(destination / "bundle.json")


@task(name="validate-and-record", retries=0, persist_result=False)
def record_bundle(path, digest=None):
    bundle = inspect_bundle(path)
    if digest and digest != bundle["provenance"]["datasetSha256"]:
        raise ValueError("Candidate/extract fingerprint mismatch")
    release = evaluate_release(bundle)
    cache = ROOT / ".cache"
    cache.mkdir(exist_ok=True)
    mlflow.set_tracking_uri("sqlite:///" + (cache / "mlflow.db").as_posix())
    client = mlflow.MlflowClient()
    experiment = client.get_experiment_by_name("wageinsight")
    experiment_id = (
        experiment.experiment_id
        if experiment
        else client.create_experiment(
            "wageinsight", artifact_location=(cache / "mlartifacts").as_uri()
        )
    )
    with mlflow.start_run(experiment_id=experiment_id, run_name=bundle["version"]) as run:
        mlflow.log_params(
            {
                "model_version": bundle["version"],
                "dataset_sha256": bundle["provenance"]["datasetSha256"],
                "bundle_sha256": fingerprint(Path(path)),
                "sample_cap": bundle["provenance"]["sampleCapPerYear"],
                "training_code_sha256": bundle["provenance"].get(
                    "trainingCodeSha256", "legacy-unrecorded"
                ),
            }
        )
        for name, values in bundle["metrics"].items():
            mlflow.log_metrics({name + "." + k: v for k, v in values.items()})
        mlflow.set_tags(
            {
                "quality_approved": str(release["qualityApproved"]).lower(),
                "population": "US full-time year-round wage workers 25-64",
                "extract_verified": str(digest is not None).lower(),
                "raw_data_logged": "false",
            }
        )
        mlflow.log_dict(
            {"metrics": bundle["metrics"], "provenance": bundle["provenance"]}, "evaluation.json"
        )
        mlflow.log_dict(release, "release.json")
        mlflow.log_artifact(path, artifact_path="model")
        release["mlflowRunId"] = run.info.run_id
    (cache / "release.json").write_text(json.dumps(release, indent=2), encoding="utf-8")
    return release


@flow(name="wageinsight-model-lifecycle", log_prints=False, persist_result=False)
def lifecycle(data=None, train=False, cap=20000):
    artifact = str(ROOT / "client/public/models/bundle.json")
    digest = None
    if data:
        expected = None if train else inspect_bundle(artifact)["provenance"]["datasetSha256"]
        digest = verify_extract(data, expected)
    if train:
        if not data:
            raise ValueError("Training needs a private CSV path")
        artifact = train_candidate(data, cap)
    return record_bundle(artifact, digest)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data")
    parser.add_argument("--train", action="store_true")
    parser.add_argument("--cap", type=int, default=20000)
    args = parser.parse_args()
    print(json.dumps(lifecycle(args.data, args.train, args.cap), indent=2))
