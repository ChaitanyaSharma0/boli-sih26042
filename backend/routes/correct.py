"""POST /correct, GET /corrections/count — logged, never auto-applied. Phase 4."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class CorrectionRequest(BaseModel):
    lesson_id: int
    original: str
    corrected: str
    lang: str


@router.post("/correct")
def correct(req: CorrectionRequest):
    raise HTTPException(501, "Correction logging not wired yet — PLAN.md Phase 4.")


@router.get("/corrections/count")
def corrections_count():
    raise HTTPException(501, "Correction logging not wired yet — PLAN.md Phase 4.")
