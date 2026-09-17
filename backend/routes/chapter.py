"""POST /chapter/extract — Extract sentences from a textbook chapter PDF.

Extracts text page-by-page using pdfplumber (or pypdf fallback). If pages
are scanned images with no embedded text, falls back to Tesseract OCR with
the Hindi language pack.

Returns a clean list of sentences split by Hindi punctuation (danda ।, ॥, ?, !).
The caller (frontend or batch processor) then loops the existing
/simplify -> /translate -> /speak endpoints per sentence (RULES.md §6).
"""

import io
import logging
import re
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

from routes.ocr import _binary, LANG

router = APIRouter()
log = logging.getLogger(__name__)

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
    """Extract text from PDF using pdfplumber, pypdf, or OCR fallback."""
    text_pieces = []

    # 1. Try pdfplumber
    try:
        import pdfplumber

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t and t.strip():
                    text_pieces.append(t.strip())
    except ImportError:
        pass
    except Exception as e:
        log.warning("pdfplumber extraction failed: %s", e)

    # 2. If no text found yet, try pypdf
    if not text_pieces:
        try:
            import pypdf

            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                t = page.extract_text()
                if t and t.strip():
                    text_pieces.append(t.strip())
        except ImportError:
            pass
        except Exception as e:
            log.warning("pypdf extraction failed: %s", e)

    # 3. If still no text (scanned PDF), try pdf2image + pytesseract
    if not text_pieces:
        try:
            from pdf2image import convert_from_bytes
            import pytesseract

            pytesseract.pytesseract.tesseract_cmd = _binary()
            images = convert_from_bytes(file_bytes)
            for img in images:
                ocr_text = pytesseract.image_to_string(img, lang=LANG)
                if ocr_text and ocr_text.strip():
                    text_pieces.append(ocr_text.strip())
        except ImportError:
            pass
        except Exception as e:
            log.warning("pdf2image + Tesseract OCR fallback failed: %s", e)

    return "\n".join(text_pieces)


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
        try:
            raw_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raw_text = file_bytes.decode("latin-1")
    else:
        # Assume PDF by default
        raw_text = extract_text_from_pdf(file_bytes)

    sentences = split_hindi_sentences(raw_text)

    if not sentences:
        raise HTTPException(
            422,
            "Could not extract any readable Hindi sentences from this file. "
            "If this is a scanned PDF, ensure Tesseract with 'hin' pack and pdf2image are available.",
        )

    return {
        "filename": file.filename,
        "sentences": sentences,
        "count": len(sentences),
    }
