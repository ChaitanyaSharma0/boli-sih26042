"""POST /translate & POST /translate-and-speak — Multilingual translation & speech routes.

Supports Santali (sat_Olck), Kurukh (kru_Deva), Mundari (unr_Deva),
Sadri (sck_Deva), Ho (hoc_Deva), Hindi (hin_Deva), and English (eng_Latn).
Returns structured response with translation, engine, mode, script validation,
and optionally synthesized speech audio.
"""

import base64
import io
from pathlib import Path
import uuid
import wave

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models import translation, tts

router = APIRouter()


class TranslateRequest(BaseModel):
    text: str
    target: str = "sat_Olck"
    source: str | None = None


class TranslateAndSpeakRequest(BaseModel):
    text: str
    target: str = "sat_Olck"
    source: str | None = None
    speaker_desc: str | None = None


@router.post("/translate")
def translate(req: TranslateRequest):
    if req.target not in translation.SUPPORTED_TARGETS:
        raise HTTPException(
            501,
            f"Target '{req.target}' is not supported. Supported targets include: "
            f"{', '.join(translation.SUPPORTED_TARGETS)}",
        )
    try:
        res = translation.translate_detailed(req.text, req.target, req.source)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))

    if res.get("mode") == "unsupported" or not res.get("translated"):
        raise HTTPException(
            501,
            f"No translation engine is currently available for {res.get('source_language')} -> {req.target}",
        )

    return {
        "translation": res["translation"],
        "translated": res["translated"],
        "target": req.target,
        "target_language": res["target_language"],
        "source_language": res["source_language"],
        "engine": res["engine"],
        "mode": res["mode"],
        "confidence": res.get("confidence"),
        "script_contamination": res["script_contamination"],
        "warnings": res["warnings"],
    }


@router.post("/translate-and-speak")
def translate_and_speak(req: TranslateAndSpeakRequest):
    if req.target not in translation.SUPPORTED_TARGETS:
        raise HTTPException(
            501,
            f"Target '{req.target}' is not supported. Supported targets include: "
            f"{', '.join(translation.SUPPORTED_TARGETS)}",
        )

    # 1. Translate
    try:
        res = translation.translate_detailed(req.text, req.target, req.source)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Translation error: {str(e)}")

    if res.get("mode") == "unsupported" or not res.get("translated"):
        raise HTTPException(
            501,
            f"No translation engine is currently available for {res.get('source_language')} -> {req.target}",
        )

    # 2. Synthesize audio with error isolation
    audio_url = None
    audio_base64 = None
    audio_error = None
    duration_seconds = None
    sample_rate = None

    lang_code = req.target.split("_")[0]
    if lang_code in tts.MODELS:
        try:
            wav_bytes = tts.synthesize(
                res["translation"], lang_code, speaker_desc=req.speaker_desc
            )
            audio_id = str(uuid.uuid4())
            filename = f"{audio_id}.wav"
            static_dir = Path(__file__).resolve().parent.parent / "static" / "audio"
            static_dir.mkdir(parents=True, exist_ok=True)
            file_path = static_dir / filename
            with open(file_path, "wb") as f:
                f.write(wav_bytes)

            audio_url = f"/audio/{filename}"
            audio_base64 = base64.b64encode(wav_bytes).decode("ascii")

            with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
                sample_rate = wf.getframerate()
                frames = wf.getnframes()
                duration_seconds = round(frames / float(sample_rate), 3)
        except Exception as e:
            # Error isolation: TTS failure must never destroy a valid translation
            audio_error = str(e)
    else:
        audio_error = f"No TTS model available for target language '{lang_code}'."

    return {
        "translation": res["translation"],
        "translated": res["translated"],
        "target": req.target,
        "target_language": res["target_language"],
        "source_language": res["source_language"],
        "engine": res["engine"],
        "mode": res["mode"],
        "confidence": res.get("confidence"),
        "script_contamination": res["script_contamination"],
        "warnings": res["warnings"],
        "audio_url": audio_url,
        "audio_base64": audio_base64,
        "audio_error": audio_error,
        "duration_seconds": duration_seconds,
        "sample_rate": sample_rate,
    }
