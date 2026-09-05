"""POST /speak — MMS-TTS wav bytes. Wired in Phase 1, phrase-bank gate Phase 2.

This route is where the honesty boundary is enforced in code: for
hoc/unr/kru/sck, text that isn't a known phrase-bank entry gets a
phrase_bank_only response, never synthesised anyway.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class SpeakRequest(BaseModel):
    text: str
    lang: str


@router.post("/speak")
def speak(req: SpeakRequest):
    raise HTTPException(501, "TTS not wired yet — PLAN.md Phase 1.")
