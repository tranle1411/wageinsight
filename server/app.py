"""Local reference API. Public predictions run in the browser."""

import json
import logging
import os
import time
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Literal
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from server.runtime import predict

PATH = Path(
    os.environ.get("MODEL_BUNDLE", Path(__file__).parents[1] / "client/public/models/bundle.json")
)


@asynccontextmanager
async def lifespan(app):
    app.state.bundle = json.loads(PATH.read_text()) if PATH.exists() else None
    yield


app = FastAPI(title="WageInsight", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173"
    ).split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profile: dict[str, int] = Field(min_length=1, max_length=20)
    variant: Literal["career", "demographic"] = "career"
    year: int = Field(default=2024, ge=2018, le=2024)


@app.middleware("http")
async def observe(request: Request, call_next):
    start = time.perf_counter()
    if request.method == "POST":
        size = 0
        chunks = []
        async for chunk in request.stream():
            size += len(chunk)
            if size > 8192:
                return JSONResponse({"detail": "Request too large"}, status_code=413)
            chunks.append(chunk)
        request._body = b"".join(chunks)
    response = await call_next(request)
    logging.getLogger("wageinsight").info(
        json.dumps(
            {
                "path": request.url.path,
                "status": response.status_code,
                "latency_ms": round((time.perf_counter() - start) * 1000, 2),
            }
        )
    )
    return response


def bundle():
    if app.state.bundle is None:
        raise HTTPException(503, "Model not trained. Run python -m ml.train.")
    return app.state.bundle


@app.get("/health/live")
def live():
    return {"status": "ok"}


@app.get("/health/ready")
def ready():
    return {"status": "ready", "modelVersion": bundle()["version"]}


@app.get("/api/v1/options")
def options():
    return {"options": bundle()["options"], "baseYear": bundle()["baseYear"]}


@app.post("/api/v1/predict")
def prediction(data: PredictionRequest):
    artifact = bundle()
    if str(data.year) not in artifact["inflation"]:
        raise HTTPException(422, "Unsupported dollar year")
    if not 25 <= data.profile.get("AGE", 0) <= 64:
        raise HTTPException(422, "Age must be 25-64")
    for field in artifact["variants"][data.variant]["features"]:
        if field != "AGE" and data.profile.get(field) not in [
            o["value"] for o in artifact["options"][field]
        ]:
            raise HTTPException(422, f"Invalid category: {field}")
    return predict(artifact, data.profile, data.variant, data.year)
