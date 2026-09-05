"""SQLite connection helpers.

One small file, two tables, no ORM. The database stores what teachers
submit and nothing a model produced, so there is no cache-invalidation
story to get wrong here.
"""

import os
import sqlite3
from pathlib import Path

_HERE = Path(__file__).resolve().parent          # backend/db
_BACKEND_ROOT = _HERE.parent                     # backend
_SCHEMA = _HERE / "schema.sql"
DEFAULT_PATH = _HERE / "boli.sqlite"


def path() -> Path:
    """Where the database lives, independent of the working directory.

    A relative DATABASE_PATH is resolved against backend/ — the directory
    the value in .env.example is written relative to — rather than against
    the process's cwd. So `uvicorn main:app` behaves the same from
    backend/, from the repo root, or from / inside a container. An
    absolute DATABASE_PATH is used as given, which is how a container
    mounts a volume.
    """
    configured = os.getenv("DATABASE_PATH")
    if not configured:
        return DEFAULT_PATH
    configured = Path(configured)
    return configured if configured.is_absolute() else _BACKEND_ROOT / configured


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(path())
    conn.row_factory = sqlite3.Row
    return conn


def init() -> None:
    """Create the tables if they are missing. Safe to run on every boot."""
    path().parent.mkdir(parents=True, exist_ok=True)
    conn = connect()
    try:
        conn.executescript(_SCHEMA.read_text(encoding="utf-8"))
        conn.commit()
    finally:
        conn.close()
