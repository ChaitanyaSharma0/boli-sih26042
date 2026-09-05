"""Phase 4 verification — run with the venv python from backend/.

    ./.venv/Scripts/python.exe test_corrections.py

Runs against a scratch database so it never touches real logged
corrections: DATABASE_PATH is pointed at a temp file before the app is
imported.

Loads no models — TestClient is used without a context manager, so the
lifespan warmup does not run, and the database is initialised directly.
"""

import io
import json
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


def test_creating_a_lesson():
    """POST /lessons gives a correction something real to point at."""
    r = client.post(
        "/lessons",
        json={
            "source_text": "किसान खेत में गेहूँ उगाता है।",
            "source_type": "ocr",
            "languages_requested": ["sat", "hoc"],
        },
    )
    assert r.status_code == 200, r.text
    lesson_id = r.json()["id"]
    assert isinstance(lesson_id, int) and lesson_id > 0, r.json()

    row = dict(
        db.connect()
        .execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,))
        .fetchone()
    )
    assert row["source_type"] == "ocr", row
    assert json.loads(row["languages_requested"]) == ["sat", "hoc"], row
    # Deliberately minimal — these are filled in by nothing yet.
    assert row["adapted_text"] is None and row["santali_translation"] is None
    print(f"lesson   : id={lesson_id}, languages={row['languages_requested']}")

    # And a correction can now reference it for real.
    r = client.post(
        "/correct",
        json={
            "lesson_id": lesson_id,
            "original": "x",
            "corrected": "y",
            "lang": "sat",
        },
    )
    assert r.status_code == 200, r.text
    linked = db.connect().execute(
        "SELECT lesson_id FROM corrections WHERE id = ?", (r.json()["id"],)
    ).fetchone()[0]
    assert linked == lesson_id
    print(f"linked   : correction -> lesson {lesson_id}")


def test_bad_lessons_are_rejected():
    base = {
        "source_text": "किसान खेत में गेहूँ उगाता है।",
        "source_type": "typed",
        "languages_requested": ["hoc"],
    }
    cases = {
        "empty text": {**base, "source_text": "   "},
        "bad source_type": {**base, "source_type": "dictated"},
        "no languages": {**base, "languages_requested": []},
        "unknown language": {**base, "languages_requested": ["hoc", "xyz"]},
    }
    for name, body in cases.items():
        r = client.post("/lessons", json=body)
        assert r.status_code == 400, f"{name} was accepted: {r.status_code}"
    print(f"rejected : {', '.join(cases)}")


def test_bad_input_is_rejected():
    base = {"lesson_id": 1, "original": "x", "corrected": "y", "lang": "hoc"}
    assert client.post("/correct", json={**base, "lang": "xyz"}).status_code == 400
    assert client.post("/correct", json={**base, "corrected": "  "}).status_code == 400
    assert client.get("/corrections/count").json() == {"count": 5}, "a rejected correction was written anyway"
    print("rejected : unknown language and empty correction, nothing written")


if __name__ == "__main__":
    test_schema_applies_twice()
    test_count_starts_empty()
    test_logging_a_correction()
    test_count_increments()
    test_creating_a_lesson()
    test_bad_lessons_are_rejected()
    test_bad_input_is_rejected()
    print(f"\nPASS  (scratch db: {_scratch})")
