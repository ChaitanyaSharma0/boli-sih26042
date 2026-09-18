"""POST /chapter/extract — Extract sentences from a textbook chapter PDF.

Each page's embedded text layer is read with pdfplumber. Devanagari text
layers are often broken: PDF fonts map conjuncts and pre-base vowel signs
badly, so पूर्व comes out as "पूव\x00" and किताब as "िकताब" — text that can
never match the phrase bank and translates badly. So every page is scored
for that damage, and a damaged or empty (scanned) page is re-read by
Tesseract from a rendered image; whichever reading is cleaner wins.
Rendering uses pypdfium2 (installed with pdfplumber), so no Poppler.

Returns a clean list of sentences split by Hindi punctuation (danda ।, ॥, ?, !).
The caller (frontend or batch processor) then loops the existing
/simplify -> /translate -> /speak endpoints per sentence (RULES.md §6).
"""

import io
import logging
import re
from typing import List

import pdfplumber
import pypdfium2 as pdfium
import pytesseract
from fastapi import APIRouter, File, HTTPException, UploadFile

from routes.ocr import _binary, LANG

router = APIRouter()
log = logging.getLogger(__name__)

# Signs of a broken Devanagari text layer: NUL or replacement characters,
# or a dependent sign (vowel sign, virama, nasal mark) starting a word —
# which never happens in real Hindi.
_GARBLED = re.compile(
    r"\x00|\ufffd|(?:^|[\s।,.!?\"'(])[\u0900-\u0903\u093a-\u094f\u0955-\u0957\u0962\u0963]"
)
OCR_DPI = 300


def garble_score(text: str) -> int:
    return len(_GARBLED.findall(text))


def _ocr_page(page) -> str:
    pytesseract.pytesseract.tesseract_cmd = _binary()
    image = page.render(scale=OCR_DPI / 72).to_pil()
    return pytesseract.image_to_string(image, lang=LANG)


# Matches sentence text followed by its terminal punctuation (or end of line)
SENTENCE_PATTERN = re.compile(r"([^।॥\?!.\n]+[।॥\?!.]?)")


def split_hindi_sentences(raw_text: str) -> List[str]:
    """Split raw text into clean Hindi sentences, preserving punctuation."""
    if not raw_text:
        return []
    matches = SENTENCE_PATTERN.findall(raw_text)
    sentences = []
    for match in matches:
        cleaned = re.sub(r"\s+", " ", match).strip()
        if len(cleaned) >= 3 and any(c.isalnum() for c in cleaned):
            if not cleaned.endswith(("।", "॥", "?", "!")):
                cleaned += "।"
            sentences.append(cleaned)
    return sentences


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Best text for every page: its text layer, or OCR where that is damaged."""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            layers = [(page.extract_text() or "").strip() for page in pdf.pages]
        document = pdfium.PdfDocument(file_bytes)
    except Exception as e:
        raise HTTPException(400, f"This file could not be read as a PDF: {e}")

    pieces = []
    try:
        for number, layer in enumerate(layers):
            text = layer
            if not layer or garble_score(layer):
                try:
                    ocr = _ocr_page(document[number]).strip()
                except Exception as e:  # Tesseract missing or failing: keep the layer
                    log.warning("OCR of page %d failed: %s", number + 1, e)
                    ocr = ""
                if ocr and (not layer or garble_score(ocr) < garble_score(layer)):
                    text = ocr
            if text:
                pieces.append(text)
    finally:
        document.close()
    return "\n".join(pieces)


def decode_text_file(file_bytes: bytes) -> str:
    """UTF-8 (with or without a BOM) or UTF-16, which Windows Notepad writes."""
    if file_bytes.startswith((b"\xff\xfe", b"\xfe\xff")):
        return file_bytes.decode("utf-16")
    try:
        return file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            400, "This text file is not UTF-8 or UTF-16. Save it as UTF-8 and try again."
        )


@router.post("/chapter/extract")
async def extract_chapter(file: UploadFile = File(...)):
    """Extract sentences from a chapter file (PDF or TXT)."""
    filename = (file.filename or "").lower()
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(400, f"Could not read uploaded file: {e}")

    if not file_bytes:
        raise HTTPException(400, "The uploaded file is empty.")

    raw_text = ""
    if filename.endswith(".txt"):
        raw_text = decode_text_file(file_bytes)
    else:
        # Assume PDF by default
        raw_text = extract_text_from_pdf(file_bytes)

    sentences = split_hindi_sentences(raw_text)

    if not sentences:
        raise HTTPException(
            422,
            "Could not extract any readable Hindi sentences from this file. "
            "If it is a scanned PDF, check that Tesseract with the 'hin' pack is installed.",
        )

    return {
        "filename": file.filename,
        "sentences": sentences,
        "count": len(sentences),
    }
