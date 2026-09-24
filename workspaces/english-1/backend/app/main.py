import html
import json
import random
import re
import urllib.error
import urllib.parse
import urllib.request

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text

from app.db import get_engine

import os

app = FastAPI(title="English Learning API")

WORD_RE = re.compile(r"^[A-Za-z][A-Za-z\-']*$")
WIKI_BASE = "https://en.wiktionary.org/api/rest_v1"
WIKI_DEF_TIMEOUT = 8
WIKI_HTML_TIMEOUT = 12
_H2_RE = re.compile(r"<h2[^>]*>.*?</h2>", re.DOTALL)
_IPA_RE = re.compile(r'<span class="IPA[^"]*"[^>]*>(.*?)</span>', re.DOTALL)
_TAG_RE = re.compile(r"<[^>]+>")

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


def _http_get(url: str, timeout: int) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": "EnglishFun/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except Exception:  # noqa: BLE001 - external API must never break lookup
        return None


def _strip_html(s: str) -> str:
    text = _TAG_RE.sub("", s or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _english_section(page_html: str) -> str:
    heads = list(_H2_RE.finditer(page_html))
    for i, h in enumerate(heads):
        name = _strip_html(h.group(0))
        if name == "English":
            end = heads[i + 1].start() if i + 1 < len(heads) else len(page_html)
            return page_html[h.start():end]
    return ""


def _fetch_external(word: str) -> dict | None:
    """Fetch English entry from Wiktionary, return normalized dict or None."""
    slug = urllib.parse.quote(word.lower())
    raw = _http_get(f"{WIKI_BASE}/page/definition/{slug}", WIKI_DEF_TIMEOUT)
    if raw is None:
        return None
    try:
        payload = json.loads(raw.decode("utf-8"))
    except ValueError:
        return None
    entries = payload.get("en") if isinstance(payload, dict) else None
    if not entries:
        return None
    meanings: list[dict] = []
    for m in entries:
        if not isinstance(m, dict) or len(meanings) >= 3:
            break
        pos = str(m.get("partOfSpeech") or "")
        for d in m.get("definitions") or []:
            if not isinstance(d, dict) or len(meanings) >= 3:
                break
            definition = _strip_html(str(d.get("definition") or ""))
            if not definition:
                continue
            examples = d.get("examples") or []
            example = _strip_html(str(examples[0])) if examples else ""
            meanings.append({"pos": pos, "definition": definition, "example": example})
    if not meanings:
        return None
    phonetic = ""
    audio = ""
    raw_html = _http_get(f"{WIKI_BASE}/page/html/{slug}", WIKI_HTML_TIMEOUT)
    if raw_html is not None:
        try:
            section = _english_section(raw_html.decode("utf-8", errors="replace"))
        except Exception:  # noqa: BLE001 - malformed HTML must not break lookup
            section = ""
        if section:
            ipa = _IPA_RE.search(section)
            if ipa:
                phonetic = _strip_html(ipa.group(1))
            mp3 = re.findall(r"//upload\.wikimedia\.org/[^\"' <>]+?\.mp3", section)
            ogg = re.findall(r"//upload\.wikimedia\.org/[^\"' <>]+?\.ogg", section)
            pick = (mp3 + ogg)[:1]
            if pick:
                audio = "https:" + html.unescape(pick[0])
    return {
        "word": word,
        "phonetic": phonetic,
        "audio": audio,
        "meanings": meanings,
        "sourceUrl": f"https://en.wiktionary.org/wiki/{slug}",
        "provider": "wiktionary",
    }


@app.get("/api/words/lookup")
def lookup_word(en: str = "") -> dict:
    word = en.strip()
    if not word:
        return {"source": "none", "words": [], "external": None, "query": ""}
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, en, vi, ipa, example, topic FROM words WHERE en ILIKE :e ORDER BY id LIMIT 5"),
            {"e": word},
        ).mappings().all()
    if rows:
        return {"source": "db", "words": [dict(r) for r in rows], "external": None, "query": word}
    if not WORD_RE.match(word):
        return {"source": "none", "words": [], "external": None, "query": word}
    external = _fetch_external(word)
    if external is None:
        return {"source": "none", "words": [], "external": None, "query": word}
    return {"source": "external", "words": [], "external": external, "query": word}


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
