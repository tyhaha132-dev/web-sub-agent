import html
import json
import random
import re
import time
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

WORD_RE = re.compile(r"^[A-Za-z][A-Za-z\s\-']*$")
WIKI_BASE = "https://en.wiktionary.org/api/rest_v1"
WIKI_DEF_TIMEOUT = 8
WIKI_HTML_TIMEOUT = 12
WIKI_MEDIA_TIMEOUT = 8
OXFORD_BASE = "https://www.oxfordlearnersdictionaries.com/definition/english"
OXFORD_TIMEOUT = 10
OXFORD_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) EnglishFun/1.0"
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


def _http_get(url: str, timeout: int, label: str, ua: str = "EnglishFun/1.0") -> bytes | None:
    """GET with one retry on fast failures. 404/timeout return None immediately."""
    for attempt in (1, 2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": ua})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            print(f"[lookup] {label} HTTP {exc.code} (attempt {attempt})", flush=True)
            if exc.code == 404:
                return None
            if exc.code == 429 and attempt == 1:
                time.sleep(2)  # nới nhịp khi bị giới hạn, rồi thử lại 1 lần
        except Exception as exc:  # noqa: BLE001 - external API must never break lookup
            if isinstance(exc, TimeoutError) or isinstance(getattr(exc, "reason", None), TimeoutError):
                print(f"[lookup] {label} timeout (attempt {attempt})", flush=True)
                return None
            print(f"[lookup] {label} {type(exc).__name__}: {exc} (attempt {attempt})", flush=True)
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
    """External lookup chain: Wiktionary first, Oxford Learner's as last resort."""
    wiki = _fetch_wiktionary(word)
    if wiki is not None and wiki.get("meanings"):
        return wiki
    return _fetch_oxford(word)


def _fetch_wiktionary(word: str) -> dict | None:
    """Fetch English entry from Wiktionary, return normalized dict or None."""
    slug = urllib.parse.quote(word.lower())
    raw = _http_get(f"{WIKI_BASE}/page/definition/{slug}", WIKI_DEF_TIMEOUT, f"def:{word}")
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
    raw_html = _http_get(f"{WIKI_BASE}/page/html/{slug}", WIKI_HTML_TIMEOUT, f"html:{word}")
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


def _fetch_oxford(word: str) -> dict | None:
    """Last resort: first English definition from Oxford Learner's (no Vietnamese)."""
    slug = "-".join(word.lower().split())
    slug = re.sub(r"[^a-z0-9\-]", "", slug).strip("-")
    if not slug:
        return None
    raw = _http_get(f"{OXFORD_BASE}/{slug}", OXFORD_TIMEOUT, f"oxford:{word}", ua=OXFORD_UA)
    if raw is None:
        return None
    page = raw.decode("utf-8", errors="replace")
    defs = [
        _strip_html(m) for m in re.findall(r'<span class="def"[^>]*>(.*?)</span>', page, re.DOTALL)
    ]
    defs = [d for d in defs if d][:3]
    if not defs:
        return None
    phon = re.search(r'<span class="phon"[^>]*>(.*?)</span>', page, re.DOTALL)
    example = re.search(r'<span class="x"[^>]*>(.*?)</span>', page, re.DOTALL)
    return {
        "word": word,
        "phonetic": _strip_html(phon.group(1)) if phon else "",
        "audio": "",
        "meanings": [
            {
                "pos": "",
                "definition": d[:500],
                "example": _strip_html(example.group(1))[:300] if example else "",
            }
            for d in defs
        ],
        "sourceUrl": f"{OXFORD_BASE}/{slug}",
        "provider": "oxford",
    }


def _pick_english_audio(items: list) -> str:
    """Pick an English pronunciation file, prefer En-*/en-* names."""
    audios = [it for it in items if isinstance(it, dict) and it.get("type") == "audio"]
    if not audios:
        return ""
    titles = [str(it.get("title") or "") for it in audios]

    def score(t: str) -> int:
        name = t.split(":", 1)[-1]
        if re.match(r"(?i)^en[-_]", name):
            return 0
        if "eng" in name.lower():
            return 1
        return 2

    titles.sort(key=score)
    filename = titles[0].split(":", 1)[-1].strip().replace(" ", "_")
    if not filename:
        return ""
    return "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)


@app.get("/api/words/audio")
def word_audio(en: str = "") -> dict:
    word = " ".join(en.strip().split())
    if not word or len(word) > 60 or not WORD_RE.match(word):
        return {"audio": None, "query": en.strip()[:60]}
    raw = _http_get(
        f"{WIKI_BASE}/page/media-list/{urllib.parse.quote(word.lower())}",
        WIKI_MEDIA_TIMEOUT,
        f"media:{word}",
    )
    if raw is None:
        return {"audio": None, "query": word}
    try:
        payload = json.loads(raw.decode("utf-8"))
    except ValueError:
        return {"audio": None, "query": word}
    items = payload.get("items") if isinstance(payload, dict) else None
    audio = _pick_english_audio(items or [])
    return {"audio": audio or None, "query": word}


@app.get("/api/words/lookup")
def lookup_word(en: str = "") -> dict:
    word = " ".join(en.strip().split())
    if not word or len(word) > 60:
        return {"source": "none", "words": [], "external": None, "query": en.strip()[:60]}
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


# ---- TOEIC Phase 1.1/1.2 slice: score bands + Part 5 bank (no accounts, anonymous like quiz) ----

TOEIC_BANDS = [
    {"min": 10, "max": 250, "level": "Starter", "focus": "Từ vựng cơ bản, ngữ pháp đơn giản, mô tả tranh", "weekly": "3 buổi nghe + 3 buổi đọc/tuần, chưa bấm giờ"},
    {"min": 250, "max": 400, "level": "Beginner", "focus": "Hội thoại ngắn, email ngắn", "weekly": "3 nghe + 3 đọc/tuần, +1 đề bấm giờ"},
    {"min": 400, "max": 550, "level": "Intermediate", "focus": "Hội thoại công sở, văn bản dài hơn", "weekly": "+2 đề/tuần, tập trung Part 2/5"},
    {"min": 550, "max": 700, "level": "Upper-Intermediate", "focus": "Bài nói phức tạp, đoạn văn dài", "weekly": "Đề full + nhật ký lỗi, tập trung Part 3/4/6/7"},
    {"min": 700, "max": 850, "level": "Advanced", "focus": "Tình huống tinh tế, tốc độ", "weekly": "Đề full + diệt điểm yếu theo part"},
    {"min": 850, "max": 990, "level": "Expert", "focus": "Gần như người bản xứ trong công việc", "weekly": "Duy trì + chuyên sâu theo ngành"},
]


def _shuffled_choices(qid: int, choices: list) -> tuple[list, list[int]]:
    """Deterministic shuffle so the correct answer is not always A.

    Returns (served_choices, order) where order[served_pos] = original_pos.
    Same qid always yields the same order, so grading can map back
    statelessly and every client sees identical options.
    """
    order = list(range(len(choices)))
    random.Random((qid * 2654435761) % (2 ** 32)).shuffle(order)
    return [choices[i] for i in order], order


def _as_list(value) -> list:
    if isinstance(value, str):
        import json as _json

        try:
            parsed = _json.loads(value)
        except ValueError:
            return []
        return list(parsed) if isinstance(parsed, list) else []
    return list(value) if isinstance(value, list) else []


def _serve_questions(rows) -> list:
    """Convert DB rows for clients: shuffle choices deterministically."""
    out = []
    for r in rows:
        d = dict(r)
        served, _ = _shuffled_choices(d["id"], _as_list(d.get("choices")))
        d["choices"] = served
        out.append(d)
    return out


def _band_for_pct(pct: float) -> dict:
    if pct >= 0.85:
        return TOEIC_BANDS[5]
    if pct >= 0.70:
        return TOEIC_BANDS[4]
    if pct >= 0.55:
        return TOEIC_BANDS[3]
    if pct >= 0.40:
        return TOEIC_BANDS[2]
    if pct >= 0.25:
        return TOEIC_BANDS[1]
    return TOEIC_BANDS[0]


@app.get("/api/toeic/levels")
def toeic_levels() -> dict:
    return {"levels": TOEIC_BANDS}


@app.get("/api/toeic/reading")
def toeic_reading(part: int = 5, count: int = 10, tag: str = "") -> dict:
    if part not in (5, 6, 7):
        raise HTTPException(status_code=400, detail="only parts 5-7 available in this phase")
    count = max(1, min(count, 100))
    engine = get_engine()
    with engine.connect() as conn:
        params: dict = {"c": count}
        tag_filter = ""
        if tag.strip():
            tag_filter = "AND grammar_tag = :g"
            params["g"] = tag.strip()
        if part == 5:
            rows = conn.execute(
                text(
                    "SELECT id, prompt, choices, NULL AS passage FROM toeic_questions "
                    f"WHERE part = 5 {tag_filter} ORDER BY RANDOM() LIMIT :c"
                ),
                params,
            ).mappings().all()
        else:
            passages = max(1, count // 2)
            rows = conn.execute(
                text(
                    "SELECT q.id, q.prompt, q.choices, q.passage_text AS passage FROM toeic_questions q "
                    "WHERE q.part = :p AND q.passage_id IN ("
                    "SELECT passage_id FROM toeic_questions WHERE part = :p AND passage_id IS NOT NULL "
                    f"{tag_filter} GROUP BY passage_id ORDER BY RANDOM() LIMIT :n"
                    ") ORDER BY q.passage_id, q.id LIMIT :c"
                ),
                {"p": part, "n": passages, "c": count, **params},
            ).mappings().all()
    return {"questions": _serve_questions(rows), "part": part, "total": len(rows)}


class ToeicAnswer(BaseModel):
    id: int = Field(ge=1)
    choice: int = Field(ge=0, le=3)


class ToeicSubmit(BaseModel):
    answers: list[ToeicAnswer] = Field(min_length=1, max_length=200)
    kind: str = Field(default="practice", pattern="^practice$")
    meta: str = Field(default="", max_length=60)
    client_id: str = Field(default="", max_length=64)
    duration_s: int = Field(default=0, ge=0, le=7200)


@app.post("/api/toeic/submit")
def toeic_submit(s: ToeicSubmit) -> dict:
    import json as _json

    ids = [a.id for a in s.answers]
    engine = get_engine()
    with engine.begin() as conn:
        rows = conn.execute(
            text("SELECT id, prompt, choices, answer, explanation, grammar_tag FROM toeic_questions WHERE id = ANY(:ids)"),
            {"ids": ids},
        ).mappings().all()
        key = {r["id"]: r for r in rows}
        details = []
        errors = []
        score = 0
        for a in s.answers:
            row = key.get(a.id)
            if row is None:
                raise HTTPException(status_code=400, detail=f"unknown question id {a.id}")
            _, order = _shuffled_choices(a.id, _as_list(row["choices"]))
            orig = order[a.choice] if 0 <= a.choice < len(order) else -1
            ok = orig == row["answer"]
            score += 1 if ok else 0
            shown_answer = order.index(row["answer"]) if row["answer"] in order else row["answer"]
            details.append({
                "id": a.id,
                "correct": ok,
                "answer": shown_answer,
                "explanation": row["explanation"],
                "grammar_tag": row["grammar_tag"],
            })
            if not ok:
                errors.append({
                    "id": a.id,
                    "prompt": row["prompt"],
                    "choice": a.choice,
                    "answer": shown_answer,
                    "explanation": row["explanation"],
                    "grammar_tag": row["grammar_tag"],
                })
        total = len(s.answers)
        pct = score / total
        band = _band_for_pct(pct)
        estimate = round((band["min"] + band["max"]) / 2 / 10) * 10
        conn.execute(
            text("INSERT INTO toeic_attempts (score, total, kind, band, meta, errors, client_id, duration_s) VALUES (:s, :t, :k, :b, :m, :e, :c, :d)"),
            {"s": score, "t": total, "k": s.kind, "b": band["level"], "m": s.meta, "e": _json.dumps(errors), "c": s.client_id, "d": s.duration_s},
        )
    return {"score": score, "total": total, "band": band, "estimate": estimate, "details": details}


@app.get("/api/toeic/attempts")
def toeic_attempts(client_id: str = "") -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        if client_id.strip():
            rows = conn.execute(
                text("SELECT id, score, total, kind, band, meta, errors, client_id, duration_s, created_at FROM toeic_attempts WHERE client_id = :c ORDER BY id DESC LIMIT 50"),
                {"c": client_id.strip()},
            ).mappings().all()
        else:
            rows = conn.execute(
                text("SELECT id, score, total, kind, band, meta, errors, client_id, duration_s, created_at FROM toeic_attempts ORDER BY id DESC LIMIT 50")
            ).mappings().all()
    history = []
    for r in rows:
        d = dict(r)
        try:
            import json as _json
            d["errors"] = _json.loads(d["errors"]) if isinstance(d["errors"], str) else (d["errors"] or [])
        except ValueError:
            d["errors"] = []
        history.append(d)
    return {"history": history, "attempts": len(history)}


class ToeicProfile(BaseModel):
    client_id: str = Field(min_length=8, max_length=64)
    display_name: str = Field(default="", max_length=40)
    target_score: int = Field(default=700, ge=10, le=990)


@app.get("/api/toeic/profile")
def toeic_profile_get(client_id: str = "") -> dict:
    if not client_id.strip():
        raise HTTPException(status_code=400, detail="client_id required")
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT client_id, display_name, target_score FROM user_toeic_profile WHERE client_id = :c"),
            {"c": client_id.strip()},
        ).mappings().one_or_none()
    if row is None:
        return {"client_id": client_id.strip(), "display_name": "", "target_score": 700}
    return dict(row)


@app.post("/api/toeic/profile")
def toeic_profile_save(p: ToeicProfile) -> dict:
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO user_toeic_profile (client_id, display_name, target_score) "
                "VALUES (:c, :n, :t) "
                "ON CONFLICT (client_id) DO UPDATE SET display_name = :n, target_score = :t"
            ),
            {"c": p.client_id, "n": p.display_name, "t": p.target_score},
        )
    return {"client_id": p.client_id, "display_name": p.display_name, "target_score": p.target_score}
