import os
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

_engine: Optional[Engine] = None


def _driver() -> str:
    """Prefer psycopg2; fall back to pure-python pg8000 when its DLL is blocked."""
    try:
        import psycopg2  # noqa: F401
        return "psycopg2"
    except Exception:  # noqa: BLE001 - any import failure means unusable here
        return "pg8000"


def _with_driver(url: str, driver: str) -> str:
    if "://" not in url:
        return url
    scheme, rest = url.split("://", 1)
    if scheme.split("+")[0] in ("postgresql", "postgres"):
        return f"postgresql+{driver}://{rest}"
    return url


def get_database_url() -> str:
    driver = _driver()
    direct = os.getenv("DATABASE_URL")
    if direct:
        return _with_driver(direct, driver)
    from urllib.parse import quote_plus
    user = quote_plus(os.getenv("POSTGRES_USER", "postgres"))
    password = quote_plus(os.getenv("POSTGRES_PASSWORD", "change-me"))
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    database = os.getenv("POSTGRES_DB", "web_sub_agent")
    return f"postgresql+{driver}://{user}:{password}@{host}:{port}/{database}"


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(get_database_url(), pool_pre_ping=True)
    return _engine
