import random

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text

from app.db import get_engine

import os

app = FastAPI(title="English Learning API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"status": "ok", "app": "english-learning"}


@app.get("/health")
def health() -> dict:
    try:
        engine = get_engine()
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "up"}
    except Exception as exc:  # noqa: BLE001 - surface connectivity cause
        return {"status": "degraded", "database": "down", "error": str(exc)}


@app.get("/api/words")
def list_words(topic: str = "") -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        if topic.strip():
            rows = conn.execute(
                text("SELECT id, en, vi, ipa, example, topic FROM words WHERE topic = :t ORDER BY id"),
                {"t": topic.strip()},
            ).mappings().all()
        else:
            rows = conn.execute(
                text("SELECT id, en, vi, ipa, example, topic FROM words ORDER BY id")
            ).mappings().all()
    return {"words": [dict(r) for r in rows]}


@app.get("/api/words/search")
def search_words(q: str = "", topic: str = "") -> dict:
    keyword = f"%{q.strip()}%"
    engine = get_engine()
    with engine.connect() as conn:
        if topic.strip():
            rows = conn.execute(
                text(
                    "SELECT id, en, vi, ipa, example, topic FROM words "
                    "WHERE (en ILIKE :k OR vi ILIKE :k) AND topic = :t "
                    "ORDER BY id LIMIT 20"
                ),
                {"k": keyword, "t": topic.strip()},
            ).mappings().all()
        else:
            rows = conn.execute(
                text(
                    "SELECT id, en, vi, ipa, example, topic FROM words "
                    "WHERE en ILIKE :k OR vi ILIKE :k ORDER BY id LIMIT 20"
                ),
                {"k": keyword},
            ).mappings().all()
    return {"words": [dict(r) for r in rows], "query": q.strip()}


@app.get("/api/topics")
def list_topics() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT topic, COUNT(*) AS total FROM words GROUP BY topic ORDER BY topic")
        ).mappings().all()
    return {"topics": [dict(r) for r in rows]}


@app.get("/api/quiz/random")
def random_quiz(count: int = 10) -> dict:
    count = max(1, min(count, 50))
    engine = get_engine()
    with engine.connect() as conn:
        words = conn.execute(text("SELECT id, en, vi FROM words")).mappings().all()
    words = [dict(w) for w in words]
    if len(words) < 4:
        raise HTTPException(status_code=400, detail="need at least 4 words for a quiz")
    picked = random.sample(words, min(count, len(words)))
    questions = []
    for w in picked:
        distractors = random.sample([x["vi"] for x in words if x["id"] != w["id"]], 3)
        choices = distractors + [w["vi"]]
        random.shuffle(choices)
        questions.append({"en": w["en"], "choices": choices, "answer": w["vi"]})
    return {"questions": questions, "total": len(questions)}


class ProgressIn(BaseModel):
    score: int = Field(ge=0, le=50)
    total: int = Field(ge=1, le=50)

    @model_validator(mode="after")
    def check_score(self) -> "ProgressIn":
        if self.score > self.total:
            raise ValueError("score cannot exceed total")
        return self


@app.get("/api/progress")
def get_progress() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, score, total, created_at FROM quiz_results ORDER BY id DESC LIMIT 50")
        ).mappings().all()
        agg = conn.execute(
            text("SELECT COUNT(*) AS attempts, COALESCE(AVG(score * 1.0 / NULLIF(total, 0)), 0) AS avg_rate FROM quiz_results")
        ).mappings().one()
    return {
        "history": [dict(r) for r in rows],
        "attempts": agg["attempts"],
        "avg_rate": float(agg["avg_rate"] or 0),
    }


@app.post("/api/progress", status_code=201)
def save_progress(p: ProgressIn) -> dict:
    engine = get_engine()
    with engine.begin() as conn:
        row = conn.execute(
            text("INSERT INTO quiz_results (score, total) VALUES (:s, :t) RETURNING id, score, total"),
            {"s": p.score, "t": p.total},
        ).mappings().one()
    return dict(row)
