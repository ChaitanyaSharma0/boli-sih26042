"""POST /speak — Arbitrary TTS audio synthesis.

Synthesizes audio for any input text in the 5 supported target languages:
Santali (sat), Ho (hoc), Mundari (unr), Kurukh (kru), and Sadri (sck).

If the input text matches a curated phrase-bank entry, the checked translation
is used as a fast, verified shortcut. If not in the phrase bank, the text is
synthesized directly using the unified TTS engine (handling script transliteration
internally).
"""

import base64
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from models import phrase_bank, tts

router = APIRouter()


class SpeakRequest(BaseModel):
    text: str
    lang: str
    speaker_desc: str | None = None


@router.post("/speak")
def speak(req: SpeakRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "Text to speak cannot be empty.")

    matched_target = None
    is_phrase_bank = False

    # Check phrase bank as a fast verified fallback/cache
    if req.lang in phrase_bank.LANGS:
        entry = phrase_bank.lookup(req.lang, text)
        if entry is not None:
            text = entry["target_text"]
            matched_target = entry["target_text"]
            is_phrase_bank = True

    try:
        wav = tts.synthesize(text, req.lang, speaker_desc=req.speaker_desc)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Speech synthesis failed: {str(e)}")

    headers = {
        "X-Phrase-Bank-Match": "true" if is_phrase_bank else "false"
    }
    if matched_target:
        b64_target = base64.b64encode(matched_target.encode("utf-8")).decode("ascii")
        headers["X-Target-Text"] = b64_target

    return Response(content=wav, media_type="audio/wav", headers=headers)
