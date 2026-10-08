import json
from pathlib import Path
import pandas as pd
from fastapi.testclient import TestClient
from ml.data import eligible
from server.app import app


def test_filter_keeps_native_citizen_without_degree_and_uses_hours():
    rows = pd.DataFrame(
        {
            "AGE": [25, 64, 35, 35, 35, 24],
            "UHRSWORK": [35, 99, 34, 40, 40, 40],
            "WKSWORK2": [6] * 6,
            "CLASSWKR": [2, 2, 2, 1, 2, 2],
            "STATEFIP": [11, 6, 6, 6, 72, 6],
            "INCWAGE": [25000] * 6,
            "PERWT": [10] * 6,
            "CITIZEN": [0] * 6,
            "DEGFIELD": [0] * 6,
        }
    )
    assert eligible(rows).tolist() == [True, True, False, False, False, False]


def test_api_contract_and_invalid_categories():
    with TestClient(app) as client:
        assert client.get("/health/ready").status_code == 200
        bundle = json.loads(Path("client/public/models/bundle.json").read_text())
        profile = bundle["variants"]["demographic"]["reference"]
        response = client.post("/api/v1/predict", json={"profile": profile})
        assert response.status_code == 200
        data = response.json()
        assert 0 < data["lower"] <= data["estimate"] <= data["upper"]
        assert (
            client.post("/api/v1/predict", json={"profile": {**profile, "AGE": 24}}).status_code
            == 422
        )
        assert (
            client.post("/api/v1/predict", json={"profile": {**profile, "OCC": -200}}).status_code
            == 422
        )
        assert (
            client.post(
                "/api/v1/predict", json={"profile": profile, "variant": "unknown"}
            ).status_code
            == 422
        )
        assert (
            client.post("/api/v1/predict", json={"profile": profile, "year": 2020}).status_code
            == 422
        )
        assert client.post('/api/v1/predict', content='x'*9000).status_code == 413


def test_readiness_without_artifact(monkeypatch, tmp_path):
    monkeypatch.setattr("server.app.PATH", tmp_path / "missing.json")
    with TestClient(app) as client:
        assert client.get("/health/live").status_code == 200
        assert client.get("/health/ready").status_code == 503
