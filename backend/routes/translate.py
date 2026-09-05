"""POST /translate — Hindi -> Santali (sat_Olck) ONLY.

Any other target is a hard 501, never a silent fall-through: PRD.md §4,
RULES.md §2. There is no translation model for Ho/Mundari/Kurukh/Sadri.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models import translation

router = APIRouter()


class TranslateRequest(BaseModel):
    text: str
    target: str = "sat_Olck"


@router.post("/translate")
def translate(req: TranslateRequest):
    if req.target not in translation.SUPPORTED_TARGETS:
        raise HTTPException(
            501,
            f"No translation model exists for '{req.target}'. Santali (sat_Olck) is "
            "the only language here with a parallel corpus. Ho, Mundari, Kurukh and "
            "Sadri are served by the curated phrase bank via /speak instead.",
        )
    try:
        translated = translation.translate(req.text, req.target)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Report the one failure mode we have actually measured, rather than
    # handing back broken output that looks fine. A caller that renders
    # this line unlabelled is overclaiming (ARCHITECTURE.md §3).
    return {
        "translated": translated,
        "target": req.target,
        "script_contamination": translation.contains_meetei_mayek(translated),
    }
