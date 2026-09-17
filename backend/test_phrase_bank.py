"""Phase 2 verification — run with the venv python from backend/.

    ./.venv/Scripts/python.exe test_phrase_bank.py

Checks that the honesty boundary holds where it is actually enforced:
arbitrary text for a phrase-bank language must come back as a refusal,
never as audio. Also checks /languages reports capability truthfully.

Uses TestClient WITHOUT a context manager on purpose — that skips the
lifespan warmup, so the refusal path runs without loading a single
model. Only the one accepted-phrase check pulls a checkpoint in.
"""

import io
import sys

from dotenv import load_dotenv

load_dotenv()

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402
from models import phrase_bank  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

client = TestClient(app)


def test_languages():
    langs = {row["code"]: row for row in client.get("/languages").json()}
    assert set(langs) == {"sat", "hoc", "unr", "kru", "sck"}, langs.keys()

    assert langs["sat"]["translation"] == "full"
    assert langs["sat"]["tts"] == "full"
    assert langs["sat"]["note"], "Santali must have TTS note"

    for code in ("hoc", "unr", "kru", "sck"):
        assert langs[code]["translation"] == "full", code
        assert langs[code]["tts"] == "full", code
    print("languages:", {c: r["translation"] for c, r in langs.items()})


def test_santali_speaks():
    """Santali uses AI4Bharat Indic Parler-TTS directly with Ol Chiki script."""
    r = client.post("/speak", json={"text": "ᱥᱟᱹᱜᱩᱱ ᱡᱚᱦᱟᱨ", "lang": "sat"})
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "audio/wav", r.headers["content-type"]
    assert r.content[:4] == b"RIFF" and r.content[8:12] == b"WAVE", r.content[:16]
    print(f"Santali spoke: {len(r.content)} bytes of wav")


def test_arbitrary_text_speaks():
    """Arbitrary multi-word text is accepted and synthesized directly via MMS TTS."""
    r = client.post(
        "/speak", json={"text": "किसान खेत में धान उगाता है।", "lang": "hoc"}
    )
    assert r.status_code == 200, r.status_code
    assert r.headers["content-type"] == "audio/wav", r.headers["content-type"]
    assert r.headers.get("X-Phrase-Bank-Match") == "false", (
        "arbitrary non-bank text should be synthesized directly, not marked as bank match"
    )
    assert r.content[:4] == b"RIFF" and r.content[8:12] == b"WAVE", r.content[:16]
    assert len(r.content) > 1000, f"Expected real audio wav bytes, got {len(r.content)}"
    print(f"arbitrary Ho text spoke: {len(r.content)} bytes of wav")


def test_bank_phrase_speaks():
    """A phrase that IS in the bank returns real audio, sent as Hindi source."""
    entry = phrase_bank.options("hoc")[0]
    r = client.post("/speak", json={"text": entry["hindi_source"], "lang": "hoc"})
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "audio/wav", r.headers["content-type"]
    assert r.headers.get("X-Phrase-Bank-Match") == "true", "expected bank match header"
    assert "X-Target-Text" in r.headers, "expected X-Target-Text header"
    assert r.content[:4] == b"RIFF" and r.content[8:12] == b"WAVE", r.content[:16]
    print(f"bank phrase spoke: {len(r.content)} bytes of wav")


def test_every_language_has_a_bank_and_speaks_it():
    for lang in phrase_bank.LANGS:
        entry = phrase_bank.options(lang)[0]
        r = client.post("/speak", json={"text": entry["target_text"], "lang": lang})
        assert r.headers["content-type"] == "audio/wav", (lang, r.text[:200])
        assert r.content[:4] == b"RIFF", lang
        print(f"  {lang}: {len(r.content)} bytes")


if __name__ == "__main__":
    test_languages()
    test_santali_speaks()
    test_arbitrary_text_speaks()
    test_bank_phrase_speaks()
    test_every_language_has_a_bank_and_speaks_it()
    print("\nPASS")
