"""Phase 3 verification — run with the venv python from backend/.

    ./.venv/Scripts/python.exe test_ocr_pedagogy.py

Runs the front half of the teacher's flow end to end: an image of a
Hindi textbook line goes in, adapted Hindi sentences come out.

The test renders its own image rather than carrying a photo fixture in
the repo, so it works on a fresh clone. That means it tests clean
rendered text, not a real phone photo of a real page — a photo will read
worse, which is exactly what /ocr's "confidence": "low" flag is for.

Needs Tesseract with the `hin` pack, and LLM_API_KEY/LLM_PROVIDER set.
"""

import io
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

from main import app  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# TestClient without a context manager: skips the lifespan model warmup,
# which nothing in this phase needs.
client = TestClient(app)

TEXTBOOK_LINE = "किसान खेत में गेहूँ उगाता है"
DEVANAGARI_FONTS = [
    r"C:\Windows\Fonts\Nirmala.ttc",
    r"C:\Windows\Fonts\mangal.ttf",
    "/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
]


def render_textbook_line(text: str) -> bytes:
    """A clean black-on-white render, standing in for a photographed page."""
    path = next((p for p in DEVANAGARI_FONTS if os.path.exists(p)), None)
    if path is None:
        raise RuntimeError(
            "No Devanagari font found to render the test image. Add one to "
            "DEVANAGARI_FONTS."
        )
    font = ImageFont.truetype(path, 48)
    image = Image.new("RGB", (1100, 140), "white")
    ImageDraw.Draw(image).text((30, 35), text, fill="black", font=font)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def test_ocr_reads_hindi() -> str:
    png = render_textbook_line(TEXTBOOK_LINE)
    r = client.post("/ocr", files={"file": ("lesson.png", png, "image/png")})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["confidence"] in ("ok", "low"), body
    assert body["text"].strip(), "OCR returned nothing at all"

    # Deliberately not asserting an exact match. Tesseract reorders some
    # Devanagari vowel signs — किसान reliably comes back as कस्िान, because
    # the ि matra is drawn before its consonant but encoded after it. The
    # rest of the line reads correctly. That is why /ocr returns the text
    # with a confidence flag instead of blocking: the teacher fixes the odd
    # word on screen 1. Assert on the words OCR can actually promise.
    for word in ("खेत", "उगाता"):
        assert word in body["text"], f"OCR did not find {word} in: {body['text']!r}"
    assert len(body["text"].split()) >= 5, body["text"]
    print(f"ocr      : {body['text']}   (confidence={body['confidence']})")
    return body["text"]


def test_simplify(text: str):
    r = client.post("/simplify", json={"text": text})
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["adapted_hindi"], "no adapted sentences came back"
    assert isinstance(body["adapted_hindi"], list)
    assert body["concept"].strip(), "no concept came back"
    for key in ("before_wps", "after_wps"):
        assert isinstance(body["readability"][key], (int, float)), body["readability"]
    for sub in body["substitutions"]:
        assert {"from", "to", "why"} <= sub.keys(), sub

    print(f"concept  : {body['concept']}")
    for s in body["adapted_hindi"]:
        print(f"adapted  : {s}")
    for sub in body["substitutions"]:
        print(f"swap     : {sub['from']} -> {sub['to']}  ({sub['why']})")
    print(
        f"readable : {body['readability']['before_wps']} words/sentence -> "
        f"{body['readability']['after_wps']}"
    )
    return body


def test_empty_text_is_rejected():
    assert client.post("/simplify", json={"text": "   "}).status_code == 400


if __name__ == "__main__":
    ocr_text = test_ocr_reads_hindi()
    test_simplify(ocr_text)
    test_empty_text_is_rejected()
    print("\nPASS")
