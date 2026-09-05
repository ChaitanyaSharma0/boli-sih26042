"""POST /speak — MMS-TTS wav bytes.

This route is where the honesty boundary from PRD.md §4 is actually
enforced in code rather than only stated in docs. TTS for Ho, Mundari,
Kurukh and Sadri is real; *translation* into them does not exist. So for
those four, this route will only speak text that matches a curated
phrase-bank entry. Arbitrary text comes back as a refusal listing what
the bank does have — never as audio, because audio of an unchecked
string is exactly the plausible-looking-but-wrong output the phrase bank
exists to avoid.
"""

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from models import phrase_bank, tts

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

    text = req.text
    if req.lang in phrase_bank.LANGS:
        entry = phrase_bank.lookup(req.lang, text)
        if entry is None:
            return {
                "phrase_bank_only": True,
                "lang": req.lang,
                "reason": (
                    "There is no translation model for this language, so BOLI can "
                    "only speak phrases from its curated phrase bank. This text is "
                    "not one of them."
                ),
                "options": phrase_bank.options(req.lang),
            }
        text = entry["target_text"]

    try:
        wav = tts.synthesize(text, req.lang)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return Response(content=wav, media_type="audio/wav")
