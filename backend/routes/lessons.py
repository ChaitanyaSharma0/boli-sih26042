"""POST /lessons — one row per teacher submission.

Deliberately minimal (ARCHITECTURE.md §3). It records what the teacher
brought in and which languages they asked for, then returns the id so a
correction has something real to point at. It does not store the adapted
text or the translation; those columns stay null.
"""

from contextlib import closing
import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import db
from routes.languages import NAMES

router = APIRouter()

SOURCE_TYPES = ("typed", "ocr")


class LessonRequest(BaseModel):
    source_text: str
    source_type: str
    languages_requested: list[str]


@router.post("/lessons")
def create_lesson(req: LessonRequest):
    if not req.source_text.strip():
        raise HTTPException(400, "The lesson text is empty.")
    if req.source_type not in SOURCE_TYPES:
        raise HTTPException(
            400,
            f"source_type must be one of {', '.join(SOURCE_TYPES)}, "
            f"not '{req.source_type}'.",
        )
    if not req.languages_requested:
        raise HTTPException(400, "No languages were requested.")

    unknown = [c for c in req.languages_requested if c not in NAMES]
    if unknown:
        raise HTTPException(
            400, f"Unknown language(s): {', '.join(unknown)}. See GET /languages."
        )

    with closing(db.connect()) as conn:
        cur = conn.execute(
            "INSERT INTO lessons (source_text, source_type, languages_requested) "
            "VALUES (?, ?, ?)",
            (
                req.source_text.strip(),
                req.source_type,
                json.dumps(req.languages_requested),
            ),
        )
        conn.commit()
        return {"id": cur.lastrowid}
