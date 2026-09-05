"""POST /translate — Hindi -> Santali (sat_Olck) ONLY. Wired in Phase 1.

Any other target is a hard 501, never a silent fall-through: PRD.md §4,
RULES.md §2. There is no translation model for Ho/Mundari/Kurukh/Sadri.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class TranslateRequest(BaseModel):
    text: str
    target: str


@router.post("/translate")
def translate(req: TranslateRequest):
    raise HTTPException(501, "Translation not wired yet — PLAN.md Phase 1.")
