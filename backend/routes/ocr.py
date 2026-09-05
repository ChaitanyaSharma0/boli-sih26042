"""POST /ocr — a photographed Hindi textbook line to text, via Tesseract.

Never blocks the flow. If Tesseract reads the page badly the text still
comes back, flagged `"confidence": "low"`, so the teacher can correct it
on screen 1 (ARCHITECTURE.md §3) — a teacher fixing one word beats a
modal telling them to retake the photo in front of a class.

OCR lives in this route rather than under models/ because it is a local
library call with no checkpoint to cache, and ARCHITECTURE.md §2 lists
only the three model wrappers.
"""

import io
import os
import shutil
from functools import lru_cache

import pytesseract
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

router = APIRouter()

LANG = "hin"

# Mean per-word confidence below this gets flagged. Tesseract reports 0-100.
LOW_CONFIDENCE_BELOW = 70

_WINDOWS_DEFAULT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


@lru_cache(maxsize=1)
def _binary() -> str:
    """Env override, then PATH, then the Windows default install location.

    The Windows installer does not add Tesseract to PATH, so PATH alone
    fails locally while working fine on a Linux deploy. TESSERACT_CMD in
    .env overrides both if a machine puts it somewhere else.
    """
    for candidate in (os.getenv("TESSERACT_CMD"), shutil.which("tesseract")):
        if candidate:
            return candidate
    if os.path.exists(_WINDOWS_DEFAULT):
        return _WINDOWS_DEFAULT
    raise RuntimeError(
        "Tesseract is not installed or not on PATH. Install it with the Hindi "
        "('hin') language pack, or set TESSERACT_CMD in backend/.env."
    )


@router.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    pytesseract.pytesseract.tesseract_cmd = _binary()
    try:
        image = Image.open(io.BytesIO(await file.read()))
    except Exception as e:
        raise HTTPException(400, f"That file could not be opened as an image: {e}")

    data = pytesseract.image_to_data(
        image, lang=LANG, output_type=pytesseract.Output.DICT
    )
    words = [w for w in data["text"] if w.strip()]
    confidences = [
        float(c) for w, c in zip(data["text"], data["conf"]) if w.strip()
    ]
    mean_conf = sum(confidences) / len(confidences) if confidences else 0.0

    return {
        "text": " ".join(words),
        "confidence": "low" if mean_conf < LOW_CONFIDENCE_BELOW else "ok",
    }
