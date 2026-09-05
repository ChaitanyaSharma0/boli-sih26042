"""POST /correct, GET /corrections/count — teacher corrections.

This writes a row and stops. No retraining is triggered, no model is
updated, and the correction is not applied to anything the teacher sees
next. PRD.md §3 calls this "a durable record that the correction loop is
architected in" — saying more than that anywhere in the UI would be a
claim the code does not back.
"""

from contextlib import closing

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import db
from routes.languages import NAMES

router = APIRouter()


class CorrectionRequest(BaseModel):
    lesson_id: int
    original: str
    corrected: str
    lang: str


@router.post("/correct")
def correct(req: CorrectionRequest):
    if req.lang not in NAMES:
        raise HTTPException(
            400, f"Unknown language '{req.lang}'. See GET /languages."
        )
    if not req.corrected.strip():
        raise HTTPException(400, "The corrected text is empty.")

    # lesson_id is stored as given and not checked against lessons.
    # POST /lessons now supplies a real id, but a correction is still worth
    # more than the foreign key: refusing to log one because the lesson row
    # went missing would lose real teacher input to a bookkeeping detail.
    with closing(db.connect()) as conn:
        cur = conn.execute(
            "INSERT INTO corrections (lesson_id, lang_code, original_text, "
            "corrected_text) VALUES (?, ?, ?, ?)",
            (req.lesson_id, req.lang, req.original, req.corrected.strip()),
        )
        conn.commit()
        return {"id": cur.lastrowid, "logged": True}


@router.get("/corrections/count")
def corrections_count():
    with closing(db.connect()) as conn:
        (count,) = conn.execute("SELECT COUNT(*) FROM corrections").fetchone()
    return {"count": count}
