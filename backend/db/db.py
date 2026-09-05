"""SQLite connection helpers.

One small file, two tables, no ORM. The database stores what teachers
submit and nothing a model produced, so there is no cache-invalidation
story to get wrong here.
"""

import os
import sqlite3
from pathlib import Path

DEFAULT_PATH = "./db/boli.sqlite"
_SCHEMA = Path(__file__).with_name("schema.sql")


def path() -> str:
    return os.getenv("DATABASE_PATH") or DEFAULT_PATH


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(path())
    conn.row_factory = sqlite3.Row
    return conn


def init() -> None:
    """Create the tables if they are missing. Safe to run on every boot."""
    Path(path()).parent.mkdir(parents=True, exist_ok=True)
    conn = connect()
    try:
        conn.executescript(_SCHEMA.read_text(encoding="utf-8"))
        conn.commit()
    finally:
        conn.close()
