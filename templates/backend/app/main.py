import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db import get_database_url, get_engine

app = FastAPI(title="Web App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"status": "ok", "database_url_configured": bool(os.getenv("DATABASE_URL"))}


@app.get("/health")
def health() -> dict:
    try:
        engine = get_engine()
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "up", "database_url": get_database_url()}
    except Exception as exc:  # noqa: BLE001 - surface connectivity cause
        return {"status": "degraded", "database": "down", "error": str(exc)}
