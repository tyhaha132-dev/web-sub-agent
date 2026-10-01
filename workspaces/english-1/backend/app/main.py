import html
import json
import random
import re
import secrets
import hashlib
import time
import urllib.error
import urllib.parse
import urllib.request

import bcrypt
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text

from app.db import get_engine

import os


def _load_local_env() -> None:
    """Nạp .env ở repo-root khi chạy tay (uvicorn trực tiếp).

    Env thật (Render/dashboard, export tay) luôn thắng vì chỉ setdefault.
    Không có file .env (prod) thì đây là no-op.
    """
    try:
        here = os.path.abspath(__file__)
        for _ in range(6):
            here = os.path.dirname(here)
            candidate = os.path.join(here, ".env")
            if os.path.isfile(candidate):
                with open(candidate, encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, val = line.split("=", 1)
                        os.environ.setdefault(key.strip(), val.strip().strip("'\""))
                return
    except Exception:
        pass


_load_local_env()

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
    except Exception as exc:  # noqa: BLE001 - chi tiet loi chi ghi log server, khong tra cho client
        print(f"[health] db down: {type(exc).__name__}", flush=True)
        return {"status": "degraded", "database": "down"}


# ---- User accounts: login gate for every service (health/root stay open) ----

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")
SESSION_DAYS = 7


def _hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def _check_pw(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("ascii"))
    except Exception:  # noqa: BLE001 - bad hash format means no match
        return False


# Hash gia tinh 1 lan luc import: login user khong ton tai van chay bcrypt
# de thoi gian phan hoi giong het user co ton tai (chong doan tai khoan).
_DUMMY_HASH = bcrypt.hashpw(b"englishfun-dummy-password", bcrypt.gensalt()).decode("ascii")


def _issue_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO user_sessions (token_hash, user_id) VALUES (:h, :u)"),
            {"h": digest, "u": user_id},
        )
    return token


def get_current_user(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="login required")
    digest = hashlib.sha256(authorization[7:].encode("utf-8")).hexdigest()
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT s.user_id AS uid, u.username AS username "
                "FROM user_sessions s JOIN users u ON u.id = s.user_id "
                "WHERE s.token_hash = :h AND s.created_at > NOW() - make_interval(0, 0, 0, :d)"
            ),
            {"h": digest, "d": SESSION_DAYS},
        ).mappings().one_or_none()
    if row is None:
        raise HTTPException(status_code=401, detail="session expired")
    return {"id": row["uid"], "username": row["username"], "token_hash": digest}


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=4, max_length=128)
    email: str = Field(min_length=5, max_length=120)


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
RESET_TTL_MIN = 15
RESET_MAX_ATTEMPTS = 5
FORGOT_COOLDOWN_S = 60


def _smtp_configured() -> bool:
    # Duong SendGrid cung can dia chi gui (SMTP_USER = Single Sender da verify).
    if os.getenv("SENDGRID_API_KEY", ""):
        return bool(os.getenv("SMTP_USER", ""))
    return bool(os.getenv("SMTP_USER", "") and os.getenv("SMTP_PASS", ""))


def _send_reset_mail_bg(to_email: str, code: str) -> None:
    """Gửi mail nền (sau khi API đã trả lời): lỗi chỉ ghi log, không treo request."""
    try:
        _send_reset_mail(to_email, code)
        print(f"[auth] da gui ma reset toi {to_email}", flush=True)
    except Exception as exc:  # noqa: BLE001 - mail hỏng vẫn giữ mã trong DB cho lần thử sau
        print(f"[auth] gui mail that bai: {type(exc).__name__}: {exc}", flush=True)


def _send_reset_mail(to_email: str, code: str) -> bool:
    """Gửi mã đặt lại mật khẩu.

    - Có SENDGRID_API_KEY: gửi qua HTTPS (dùng cho host chặn SMTP như Render).
    - Không: Gmail SMTP trực tiếp (dev local). Chưa cấu hình gì: in mã ra log.
    """
    api_key = os.getenv("SENDGRID_API_KEY", "")
    if api_key:
        _send_via_sendgrid(api_key, to_email, code)
        return True
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587") or 587)
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASS", "").replace(" ", "")
    if not user or not password:
        print(f"[auth] SMTP chua cau hinh — ma reset cho {to_email}: {code}", flush=True)
        return False
    import smtplib
    from email.message import EmailMessage

    msg = EmailMessage()
    msg["Subject"] = "EnglishFun — ma dat lai mat khau"
    msg["From"] = os.getenv("SMTP_FROM", user)
    msg["To"] = to_email
    msg.set_content(
        f"Ma dat lai mat khau EnglishFun cua ban la: {code}\n"
        f"Ma co hieu luc {RESET_TTL_MIN} phut. Neu ban khong yeu cau, hay bo qua email nay."
    )
    attempts = 0
    use_ssl = port == 465
    while True:
        try:
            if use_ssl:
                # Cong 465 (SMTPS): dung khi mang chan STARTTLS/587.
                with smtplib.SMTP_SSL(host, port, timeout=20) as s:
                    s.login(user, password)
                    s.send_message(msg)
            else:
                with smtplib.SMTP(host, port, timeout=20) as s:
                    s.starttls()
                    s.login(user, password)
                    s.send_message(msg)
            return True
        except Exception as exc:  # noqa: BLE001 - gateway Gmail hay treo, thử lại 1 lần
            attempts += 1
            if attempts >= 2:
                raise
            print(f"[auth] gui mail lan {attempts} loi {type(exc).__name__}: {exc} — thu lai", flush=True)
            time.sleep(3)


def _send_via_sendgrid(api_key: str, to_email: str, code: str) -> None:
    """Gửi qua SendGrid HTTPS API (stdlib, không thêm dependency). Thử lại 1 lần."""
    import urllib.request

    sender = os.getenv("SMTP_USER", "")
    if not EMAIL_RE.match(sender):
        raise ValueError("thieu SMTP_USER (dia chi gui SendGrid Single Sender)")
    payload = json.dumps(
        {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": sender},
            "subject": "EnglishFun — ma dat lai mat khau",
            "content": [
                {
                    "type": "text/plain",
                    "value": (
                        f"Ma dat lai mat khau EnglishFun cua ban la: {code}\n"
                        f"Ma co hieu luc {RESET_TTL_MIN} phut. "
                        "Neu ban khong yeu cau, hay bo qua email nay."
                    ),
                }
            ],
        }
    ).encode("utf-8")
    attempts = 0
    while True:
        try:
            req = urllib.request.Request(
                "https://api.sendgrid.com/v3/mail/send",
                data=payload,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=20) as res:
                if res.status not in (200, 201, 202):
                    raise RuntimeError(f"sendgrid status {res.status}")
            return
        except Exception as exc:  # noqa: BLE001 - thử lại 1 lần rồi ném ra cho bg task ghi log
            attempts += 1
            if attempts >= 2:
                raise
            print(f"[auth] gui mail lan {attempts} loi {type(exc).__name__}: {exc} — thu lai", flush=True)
            time.sleep(3)


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=128)


class ChangePwIn(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=4, max_length=128)


@app.post("/api/auth/register", status_code=201)
def auth_register(body: RegisterIn) -> dict:
    username = body.username.strip()
    email = body.email.strip().lower()
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail="Tên tài khoản 3–32 ký tự: chữ, số, _, -, .")
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Email chưa đúng")
    engine = get_engine()
    with engine.begin() as conn:
        exists = conn.execute(
            text("SELECT id FROM users WHERE username = :u"), {"u": username}
        ).mappings().one_or_none()
        if exists is not None:
            raise HTTPException(status_code=409, detail="Tên này đã có người dùng")
        mail_used = conn.execute(
            text("SELECT id FROM users WHERE email = :e"), {"e": email}
        ).mappings().one_or_none()
        if mail_used is not None:
            raise HTTPException(status_code=409, detail="Email này đã được đăng ký")
        user_id = conn.execute(
            text("INSERT INTO users (username, password_hash, email) VALUES (:u, :h, :e) RETURNING id"),
            {"u": username, "h": _hash_pw(body.password), "e": email},
        ).scalar()
    return {"token": _issue_token(int(user_id)), "username": username}


@app.post("/api/auth/login")
def auth_login(body: LoginIn) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, username, password_hash FROM users WHERE username = :u"),
            {"u": body.username.strip()},
        ).mappings().one_or_none()
    if row is None:
        # Chay bcrypt voi hash gia de ke tan cong khong phan biet duoc
        # tai khoan co ton tai hay khong qua thoi gian phan hoi.
        _check_pw(body.password, _DUMMY_HASH)
        raise HTTPException(status_code=401, detail="Tài khoản hoặc mật khẩu không đúng. Vui lòng thử lại.")
    if not _check_pw(body.password, str(row["password_hash"])):
        raise HTTPException(status_code=401, detail="Tài khoản hoặc mật khẩu không đúng. Vui lòng thử lại.")
    return {"token": _issue_token(int(row["id"])), "username": str(row["username"])}


@app.get("/api/auth/me")
def auth_me(user: dict = Depends(get_current_user)) -> dict:
    return {"username": user["username"]}


@app.post("/api/auth/logout")
def auth_logout(user: dict = Depends(get_current_user)) -> dict:
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM user_sessions WHERE token_hash = :h"), {"h": user["token_hash"]}
        )
    return {"ok": True}


@app.post("/api/auth/change-password")
def auth_change_password(body: ChangePwIn, user: dict = Depends(get_current_user)) -> dict:
    engine = get_engine()
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT password_hash FROM users WHERE id = :u"), {"u": user["id"]}
        ).mappings().one_or_none()
        if row is None or not _check_pw(body.old_password, str(row["password_hash"])):
            raise HTTPException(status_code=400, detail="Mật khẩu cũ không đúng")
        conn.execute(
            text("UPDATE users SET password_hash = :h WHERE id = :u"),
            {"h": _hash_pw(body.new_password), "u": user["id"]},
        )
        # đá mọi phiên khác ra, giữ phiên đang dùng
        conn.execute(
            text("DELETE FROM user_sessions WHERE user_id = :u AND token_hash <> :h"),
            {"u": user["id"], "h": user["token_hash"]},
        )
    return {"ok": True}


class ForgotIn(BaseModel):
    username: str = Field(min_length=1, max_length=32)


class ResetIn(BaseModel):
    username: str = Field(min_length=1, max_length=32)
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=4, max_length=128)


@app.post("/api/auth/forgot")
def auth_forgot(body: ForgotIn, background: BackgroundTasks) -> dict:
    # Luôn trả ok:true để không lộ tài khoản nào tồn tại.
    engine = get_engine()
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT id, email FROM users WHERE username = :u"),
            {"u": body.username.strip()},
        ).mappings().one_or_none()
        if row is not None and row["email"]:
            recent = conn.execute(
                text(
                    "SELECT id FROM password_resets "
                    "WHERE user_id = :u AND created_at > NOW() - make_interval(0, 0, 0, 0, 0, 0, :c) "
                    "LIMIT 1"
                ),
                {"u": row["id"], "c": FORGOT_COOLDOWN_S},
            ).first()
            if recent is not None:
                # Chống email bombing: mã trước còn mới thì giữ nguyên, vẫn trả ok.
                return {"ok": True}
            code = f"{secrets.randbelow(1_000_000):06d}"
            conn.execute(
                text("DELETE FROM password_resets WHERE user_id = :u"), {"u": row["id"]}
            )
            conn.execute(
                text(
                    "INSERT INTO password_resets (user_id, code_hash, expires_at) "
                    "VALUES (:u, :h, NOW() + make_interval(0, 0, 0, 0, 0, :m))"
                ),
                {"u": row["id"], "h": _hash_pw(code), "m": RESET_TTL_MIN},
            )
            email = str(row["email"])
            if _smtp_configured():
                # Gửi nền để Gmail chậm/treo không treo request (UI khỏi đơ nút "Đang gửi").
                background.add_task(_send_reset_mail_bg, email, code)
            else:
                try:
                    _send_reset_mail(email, code)
                except Exception as exc:  # noqa: BLE001 - dev chưa cấu hình: chỉ in log
                    print(f"[auth] gui mail that bai: {type(exc).__name__}", flush=True)
    return {"ok": True}


@app.post("/api/auth/reset")
def auth_reset(body: ResetIn) -> dict:
    engine = get_engine()
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT id FROM users WHERE username = :u"),
            {"u": body.username.strip()},
        ).mappings().one_or_none()
        if row is not None:
            codes = conn.execute(
                text(
                    "SELECT id, code_hash, attempts FROM password_resets "
                    "WHERE user_id = :u AND expires_at > NOW() ORDER BY id DESC"
                ),
                {"u": row["id"]},
            ).mappings().all()
            for c in codes:
                if int(c["attempts"]) >= RESET_MAX_ATTEMPTS:
                    continue
                if _check_pw(body.code.strip(), str(c["code_hash"])):
                    conn.execute(
                        text("UPDATE users SET password_hash = :h WHERE id = :u"),
                        {"h": _hash_pw(body.new_password), "u": row["id"]},
                    )
                    conn.execute(
                        text("DELETE FROM user_sessions WHERE user_id = :u"), {"u": row["id"]}
                    )
                    conn.execute(
                        text("DELETE FROM password_resets WHERE user_id = :u"), {"u": row["id"]}
                    )
                    return {"ok": True}
                conn.execute(
                    text("UPDATE password_resets SET attempts = attempts + 1 WHERE id = :i"),
                    {"i": c["id"]},
                )
    raise HTTPException(status_code=400, detail="Mã sai hoặc hết hạn")


WORDS_DEFAULT_LIMIT = 100
WORDS_MAX_LIMIT = 500


@app.get("/api/words")
def list_words(
    topic: str = "",
    limit: int = WORDS_DEFAULT_LIMIT,
    offset: int = 0,
    user: dict = Depends(get_current_user),
) -> dict:
    # Gioi han phan hoi (chong full-dump): mac dinh 100, toi da 500.
    limit = max(1, min(limit, WORDS_MAX_LIMIT))
    offset = max(0, offset)
    engine = get_engine()
    with engine.connect() as conn:
        if topic.strip():
            total = conn.execute(
                text("SELECT COUNT(*) FROM words WHERE topic = :t"),
                {"t": topic.strip()},
            ).scalar()
            rows = conn.execute(
                text(
                    "SELECT id, en, vi, ipa, example, topic FROM words "
                    "WHERE topic = :t ORDER BY id LIMIT :l OFFSET :o"
                ),
                {"t": topic.strip(), "l": limit, "o": offset},
            ).mappings().all()
        else:
            total = conn.execute(text("SELECT COUNT(*) FROM words")).scalar()
            rows = conn.execute(
                text("SELECT id, en, vi, ipa, example, topic FROM words ORDER BY id LIMIT :l OFFSET :o"),
                {"l": limit, "o": offset},
            ).mappings().all()
    return {"words": [dict(r) for r in rows], "total": int(total or 0)}


@app.get("/api/words/search")
def search_words(q: str = "", topic: str = "", user: dict = Depends(get_current_user)) -> dict:
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
def word_audio(en: str = "", user: dict = Depends(get_current_user)) -> dict:
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
def lookup_word(en: str = "", user: dict = Depends(get_current_user)) -> dict:
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
def list_topics(user: dict = Depends(get_current_user)) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT topic, COUNT(*) AS total FROM words GROUP BY topic ORDER BY topic")
        ).mappings().all()
    return {"topics": [dict(r) for r in rows]}


@app.get("/api/quiz/random")
def random_quiz(count: int = 10, user: dict = Depends(get_current_user)) -> dict:
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
def get_progress(user: dict = Depends(get_current_user)) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, score, total, created_at FROM quiz_results WHERE user_id = :u ORDER BY id DESC LIMIT 50"),
            {"u": user["id"]},
        ).mappings().all()
        agg = conn.execute(
            text("SELECT COUNT(*) AS attempts, COALESCE(AVG(score * 1.0 / NULLIF(total, 0)), 0) AS avg_rate FROM quiz_results WHERE user_id = :u"),
            {"u": user["id"]},
        ).mappings().one()
    return {
        "history": [dict(r) for r in rows],
        "attempts": agg["attempts"],
        "avg_rate": float(agg["avg_rate"] or 0),
    }


@app.post("/api/progress", status_code=201)
def save_progress(p: ProgressIn, user: dict = Depends(get_current_user)) -> dict:
    engine = get_engine()
    with engine.begin() as conn:
        row = conn.execute(
            text("INSERT INTO quiz_results (score, total, user_id) VALUES (:s, :t, :u) RETURNING id, score, total"),
            {"s": p.score, "t": p.total, "u": user["id"]},
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
def toeic_levels(user: dict = Depends(get_current_user)) -> dict:
    return {"levels": TOEIC_BANDS}


@app.get("/api/toeic/reading")
def toeic_reading(part: int = 5, count: int = 10, tag: str = "", user: dict = Depends(get_current_user)) -> dict:
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
    duration_s: int = Field(default=0, ge=0, le=7200)
    expected_total: int = Field(default=0, ge=0, le=200)


@app.post("/api/toeic/submit")
def toeic_submit(s: ToeicSubmit, user: dict = Depends(get_current_user)) -> dict:
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
        answered = len(s.answers)
        # Nop bai som: cau bo trong tinh 0 diem, total = so cau cua de.
        if s.expected_total >= answered and s.expected_total <= 200:
            total = s.expected_total if s.expected_total >= 1 else answered
        pct = score / total
        band = _band_for_pct(pct)
        estimate = round((band["min"] + band["max"]) / 2 / 10) * 10
        conn.execute(
            text("INSERT INTO toeic_attempts (score, total, kind, band, meta, errors, user_id, duration_s) VALUES (:s, :t, :k, :b, :m, :e, :u, :d)"),
            {"s": score, "t": total, "k": s.kind, "b": band["level"], "m": s.meta, "e": _json.dumps(errors), "u": user["id"], "d": s.duration_s},
        )
    return {"score": score, "total": total, "answered": answered, "band": band, "estimate": estimate, "details": details}


@app.get("/api/toeic/attempts")
def toeic_attempts(user: dict = Depends(get_current_user)) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, score, total, kind, band, meta, errors, duration_s, created_at FROM toeic_attempts WHERE user_id = :u ORDER BY id DESC LIMIT 50"),
            {"u": user["id"]},
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
    display_name: str = Field(default="", max_length=40)
    target_score: int = Field(default=700, ge=10, le=990)


@app.get("/api/toeic/profile")
def toeic_profile_get(user: dict = Depends(get_current_user)) -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT display_name, target_score FROM user_toeic_profile WHERE user_id = :u"),
            {"u": user["id"]},
        ).mappings().one_or_none()
    if row is None:
        return {"username": user["username"], "display_name": "", "target_score": 700}
    return {"username": user["username"], **dict(row)}


@app.post("/api/toeic/profile")
def toeic_profile_save(p: ToeicProfile, user: dict = Depends(get_current_user)) -> dict:
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO user_toeic_profile (user_id, display_name, target_score) "
                "VALUES (:u, :n, :t) "
                "ON CONFLICT (user_id) DO UPDATE SET display_name = :n, target_score = :t"
            ),
            {"u": user["id"], "n": p.display_name, "t": p.target_score},
        )
    return {"username": user["username"], "display_name": p.display_name, "target_score": p.target_score}


# ---- User folders (server-side, per account; replaces browser localStorage) ----

FOLDER_KEY_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
FOLDER_STATUS = {"new", "learning", "known"}


class FolderWordIn(BaseModel):
    id: int = Field(ge=0, le=10**13)
    en: str = Field(min_length=1, max_length=40)
    vi: str = Field(default="", max_length=200)
    ipa: str = Field(default="", max_length=100)
    example: str = Field(default="", max_length=500)
    audio: str = Field(default="", max_length=1000)


class FolderIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    words: list[FolderWordIn] = Field(default_factory=list, max_length=500)
    status: dict[str, str] = Field(default_factory=dict)
    stats: dict[str, int] = Field(default_factory=dict)
    createdAt: int = Field(default=0, ge=0, le=10**13)

    @model_validator(mode="after")
    def check_folder(self) -> "FolderIn":
        if len(self.status) > 2000:
            raise ValueError("too many status entries")
        for k, v in self.status.items():
            if len(k) > 40 or v not in FOLDER_STATUS:
                raise ValueError("bad status entry")
        for k, v in self.stats.items():
            if k not in {"attempts", "correct", "total"} or v < 0 or v > 10**9:
                raise ValueError("bad stats entry")
        return self


def _folder_doc(key: str, body: FolderIn, created_at: int) -> dict:
    import time as _time
    return {
        "id": key,
        "name": body.name,
        "createdAt": created_at or int(_time.time() * 1000),
        "words": [w.model_dump() for w in body.words],
        "status": dict(body.status),
        "stats": {
            "attempts": body.stats.get("attempts", 0),
            "correct": body.stats.get("correct", 0),
            "total": body.stats.get("total", 0),
        },
    }


@app.get("/api/folders")
def folders_list(user: dict = Depends(get_current_user)) -> dict:
    import json as _json
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT folder_key, data FROM user_folders WHERE user_id = :u ORDER BY updated_at DESC"),
            {"u": user["id"]},
        ).mappings().all()
    out = []
    for r in rows:
        data = r["data"]
        if isinstance(data, str):
            try:
                data = _json.loads(data)
            except ValueError:
                continue
        if isinstance(data, dict):
            out.append({**data, "id": r["folder_key"]})
    return {"folders": out}


@app.put("/api/folders/{key}")
def folder_put(key: str, body: FolderIn, user: dict = Depends(get_current_user)) -> dict:
    import json as _json
    import time as _time
    if not FOLDER_KEY_RE.match(key):
        raise HTTPException(status_code=400, detail="bad folder key")
    engine = get_engine()
    with engine.begin() as conn:
        old = conn.execute(
            text("SELECT data FROM user_folders WHERE user_id = :u AND folder_key = :k"),
            {"u": user["id"], "k": key},
        ).mappings().one_or_none()
        created_at = body.createdAt
        if not created_at and old is not None:
            prev = old["data"]
            if isinstance(prev, str):
                try:
                    prev = _json.loads(prev)
                except ValueError:
                    prev = {}
            if isinstance(prev, dict) and isinstance(prev.get("createdAt"), int):
                created_at = prev["createdAt"]
        doc = _folder_doc(key, body, created_at or int(_time.time() * 1000))
        conn.execute(
            text(
                "INSERT INTO user_folders (user_id, folder_key, data, updated_at) "
                "VALUES (:u, :k, :d, NOW()) "
                "ON CONFLICT (user_id, folder_key) DO UPDATE SET data = :d, updated_at = NOW()"
            ),
            {"u": user["id"], "k": key, "d": _json.dumps(doc, ensure_ascii=False)},
        )
    return {"ok": True}


@app.delete("/api/folders/{key}")
def folder_delete(key: str, user: dict = Depends(get_current_user)) -> dict:
    if not FOLDER_KEY_RE.match(key):
        raise HTTPException(status_code=400, detail="bad folder key")
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM user_folders WHERE user_id = :u AND folder_key = :k"),
            {"u": user["id"], "k": key},
        )
    return {"ok": True}
