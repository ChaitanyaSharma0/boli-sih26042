"""POST /speak — MMS-TTS wav bytes.

The phrase-bank gate for hoc/unr/kru/sck lands here in PLAN.md Phase 2;
today this route speaks whatever text it is given. TTS itself is real
for all four languages — it is *translation* into them that does not
exist (PRD.md §4).
"""

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from models import tts

router = APIRouter()


class SpeakRequest(BaseModel):
    text: str
    lang: str


@router.post("/speak")
def speak(req: SpeakRequest):
    if req.lang == "sat":
        raise HTTPException(
            501,
            "No text-to-speech checkpoint exists for Santali, from us or anyone "
            "else. Santali is translation-only — see /translate.",
        )
    try:
        wav = tts.synthesize(req.text, req.lang)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return Response(content=wav, media_type="audio/wav")
