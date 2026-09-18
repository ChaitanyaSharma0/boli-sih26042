"""Chapter extraction on real files — Tesseract with `hin`, no model load.

    ./.venv/Scripts/python.exe test_chapter_pdf.py

fixtures/garbled_devanagari.pdf is a Chrome-printed PDF whose embedded
text layer is broken the way real Devanagari PDFs often are: pdfplumber
reads किताब as "िकताब" and नमस्ते as "नम\\x00े". Those sentences could
never match the phrase bank. The extractor must notice and OCR the page.
"""

import io
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from main import app
from routes.chapter import decode_text_file, extract_text_from_pdf, garble_score, split_hindi_sentences

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

FIXTURE = Path(__file__).parent / "fixtures" / "garbled_devanagari.pdf"
EXPECTED = ["पानी हमारा जीवन है।", "किताब खोलो।", "नमस्ते।", "किसान खेत में धान उगाता है।"]

client = TestClient(app)  # no context manager: skips model warmup


def test_garble_score():
    for clean in EXPECTED + ["क्या सब समझ आया?", "हाँ!"]:
        assert garble_score(clean) == 0, clean
    assert garble_score("िकताब खोलो।") == 1
    assert garble_score("नम" + chr(0) + "े।") >= 1
    print("garble   : clean text scores 0, broken layers are caught")


def test_garbled_pdf_is_recovered_by_ocr():
    sentences = split_hindi_sentences(extract_text_from_pdf(FIXTURE.read_bytes()))
    assert sentences == EXPECTED, sentences
    print(f"pdf      : {sentences}")


def test_route_returns_clean_sentences_that_match_the_bank():
    with FIXTURE.open("rb") as f:
        r = client.post("/chapter/extract", files={"file": ("chapter.pdf", f, "application/pdf")})
    assert r.status_code == 200, r.text
    assert r.json()["sentences"] == EXPECTED
    # The point of the fix: recovered sentences now hit the phrase bank.
    for text in ("किताब खोलो।", "नमस्ते।"):
        speak = client.post("/speak", json={"text": text, "lang": "kru"})
        assert speak.headers["content-type"] == "audio/wav", (text, speak.text[:120])
    print("route    : recovered sentences play from the Kurukh bank")


def test_text_files_in_every_encoding_notepad_writes():
    text = "पानी हमारा जीवन है। नमस्ते।"
    for encoded in (text.encode("utf-8"), text.encode("utf-8-sig"), text.encode("utf-16")):
        assert decode_text_file(encoded) == text, encoded[:6]
        r = client.post("/chapter/extract", files={"file": ("c.txt", encoded, "text/plain")})
        assert r.json()["sentences"] == ["पानी हमारा जीवन है।", "नमस्ते।"], r.text
    r = client.post("/chapter/extract", files={"file": ("c.txt", "पानी".encode("cp1252", "replace") + bytes([0x9D, 0xFF]), "text/plain")})
    assert r.status_code == 400, "undecodable text must be refused, not turned into mojibake"
    print("txt      : UTF-8, UTF-8 with BOM and UTF-16 all read; others refused")


def test_not_a_pdf_is_a_clear_400():
    r = client.post("/chapter/extract", files={"file": ("x.pdf", b"not a pdf", "application/pdf")})
    assert r.status_code == 400, r.status_code
    print("bad pdf  : 400 with a readable message")


if __name__ == "__main__":
    test_garble_score()
    test_garbled_pdf_is_recovered_by_ocr()
    test_route_returns_clean_sentences_that_match_the_bank()
    test_text_files_in_every_encoding_notepad_writes()
    test_not_a_pdf_is_a_clear_400()
    print("\nPASS")
