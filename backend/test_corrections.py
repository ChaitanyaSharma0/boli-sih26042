"""Phase 4 verification — run with the venv python from backend/.

    ./.venv/Scripts/python.exe test_corrections.py

Runs against a scratch database so it never touches real logged
corrections: DATABASE_PATH is pointed at a temp file before the app is
imported.

Loads no models — TestClient is used without a context manager, so the
lifespan warmup does not run, and the database is initialised directly.
"""

import io
import os
import sys
import tempfile

from dotenv import load_dotenv

load_dotenv()

# Must be set before anything reads it. A test that appends rows to the
# real corrections log would quietly inflate the "N corrections collected"
# counter the frontend shows.
_scratch = os.path.join(tempfile.mkdtemp(), "test_boli.sqlite")
os.environ["DATABASE_PATH"] = _scratch

from fastapi.testclient import TestClient  # noqa: E402

from db import db  # noqa: E402
from main import app  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

client = TestClient(app)


def test_schema_applies_twice():
    """init() runs on every boot, so it has to be idempotent."""
    db.init()
    db.init()
    tables = {
        r[0]
        for r in db.connect().execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
    }
    assert {"lessons", "corrections"} <= tables, tables
    print("schema   :", ", ".join(sorted(tables)))


def test_count_starts_empty():
    assert client.get("/corrections/count").json() == {"count": 0}


def test_logging_a_correction():
    r = client.post(
        "/correct",
        json={
            "lesson_id": 1,
            "original": "ଦା ଆଲେ ଜୀଉ ତାନା",
            "corrected": "ଦା ଆଲେ ଜୀଉ ତାନାଃ",
            "lang": "hoc",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["logged"] is True and isinstance(body["id"], int), body
    print(f"logged   : correction id={body['id']}")

    assert client.get("/corrections/count").json() == {"count": 1}

    row = dict(
        db.connect()
        .execute("SELECT * FROM corrections WHERE id = ?", (body["id"],))
        .fetchone()
    )
    assert row["lang_code"] == "hoc" and row["corrected_text"].endswith("ଃ"), row
    assert row["created_at"], "created_at was not filled in"
    print(f"stored   : {row['original_text']} -> {row['corrected_text']}")


def test_count_increments():
    for i in range(3):
        client.post(
            "/correct",
            json={
                "lesson_id": 1,
                "original": "x",
                "corrected": f"y{i}",
                "lang": "kru",
            },
        )
    assert client.get("/corrections/count").json() == {"count": 4}
    print("count    : 4 after three more")


def test_bad_input_is_rejected():
    base = {"lesson_id": 1, "original": "x", "corrected": "y", "lang": "hoc"}
    assert client.post("/correct", json={**base, "lang": "xyz"}).status_code == 400
    assert client.post("/correct", json={**base, "corrected": "  "}).status_code == 400
    assert client.get("/corrections/count").json() == {"count": 4}, "a rejected correction was written anyway"
    print("rejected : unknown language and empty correction, nothing written")


if __name__ == "__main__":
    test_schema_applies_twice()
    test_count_starts_empty()
    test_logging_a_correction()
    test_count_increments()
    test_bad_input_is_rejected()
    print(f"\nPASS  (scratch db: {_scratch})")
