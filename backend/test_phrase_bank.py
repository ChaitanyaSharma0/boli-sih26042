"""Phase 2 verification — run with the venv python from backend/.

    ./.venv/Scripts/python.exe test_phrase_bank.py

Checks that the honesty boundary holds where it is actually enforced:
arbitrary text for a phrase-bank language must come back as a refusal,
never as audio. Also checks /languages reports capability truthfully.

Uses TestClient WITHOUT a context manager on purpose — that skips the
lifespan warmup, so the refusal path runs without loading a single
model. Only the one accepted-phrase check pulls a checkpoint in.
"""

import base64
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
    assert langs["sat"]["tts"] == "none"
    assert langs["sat"]["note"], "Santali must explain why it has no TTS"

    for code in ("hoc", "unr", "kru", "sck"):
        assert langs[code]["translation"] == "phrase_bank", code
        assert langs[code]["tts"] == "full", code
    # phrases_verified reports the bank's real state, per language.
    assert langs["sat"]["phrases_verified"] is False, "Santali has no phrase bank"
    for code in ("hoc", "unr", "kru", "sck"):
        assert langs[code]["phrases_verified"] is phrase_bank.verified_for(code), code
    print("languages:", {c: r["translation"] for c, r in langs.items()})


def test_arbitrary_text_is_refused():
    """The whole point of Phase 2. Real Hindi, not in the bank, for Ho."""
    r = client.post(
        "/speak", json={"text": "किसान खेत में धान उगाता है।", "lang": "hoc"}
    )
    assert r.status_code == 200, r.status_code
    assert r.headers["content-type"].startswith("application/json"), (
        "arbitrary text for Ho produced audio — the phrase-bank gate is not "
        "holding, which is a PRD.md §4 violation, not a cosmetic bug."
    )
    body = r.json()
    assert body["phrase_bank_only"] is True, body
    assert "X-Target-Text" not in r.headers, "a refusal must not name a spoken phrase"
    assert body["options"], "a refusal must tell the teacher what IS available"
    # Every entry was checked by native speakers on 2026-09-18 (see
    # phrase_bank.VERIFICATION). The claim must stay tied to the data: an
    # entry marked verified needs the record that vouches for it.
    assert all(o["verified"] is True for o in body["options"]), body["options"]
    assert phrase_bank.VERIFICATION["date"] and phrase_bank.VERIFICATION["by"]
    print(f"refused arbitrary Ho text, offered {len(body['options'])} phrase(s)")


def test_bank_phrase_speaks():
    """A phrase that IS in the bank returns real audio, sent as Hindi source."""
    entry = phrase_bank.options("hoc")[0]
    r = client.post("/speak", json={"text": entry["hindi_source"], "lang": "hoc"})
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "audio/wav", r.headers["content-type"]
    assert r.content[:4] == b"RIFF" and r.content[8:12] == b"WAVE", r.content[:16]
    print(f"bank phrase spoke: {len(r.content)} bytes of wav")
    # Phase 12: the response names the phrase it actually spoke.
    assert r.headers["X-Phrase-Bank-Match"] == "true", r.headers
    spoken = base64.b64decode(r.headers["X-Target-Text"]).decode("utf-8")
    assert spoken == entry["target_text"], spoken
    print(f"header names the spoken phrase: {spoken}")


def test_sentence_final_danda_still_matches():
    """Chapter extraction and OCR end sentences with a danda; the bank doesn't."""
    for lang in phrase_bank.LANGS:
        entry = phrase_bank.options(lang)[0]
        for text in (entry["hindi_source"] + "।", " " + entry["hindi_source"] + " ।"):
            assert phrase_bank.lookup(lang, text) == entry, (lang, text)
    # Punctuation inside the sentence is ignored too, words are not.
    assert phrase_bank.lookup("hoc", "यहाँ, बैठो!") is not None
    assert phrase_bank.lookup("hoc", '"किताब खोलो"') is not None
    # The visarga is a letter, not punctuation: a target ending in ଃ matches.
    assert phrase_bank.lookup("hoc", "ଇସ୍କୁଲ ସେନୋଃ ମେ") is not None
    # A different sentence, or a near miss, is still refused.
    assert phrase_bank.lookup("hoc", "सूरज पूर्व दिशा में उगता है।") is None
    assert phrase_bank.lookup("hoc", "यहाँ बैठ") is None
    print("punctuation ignored inside and at the end; words still exact")


def test_every_language_has_a_bank_and_speaks_it():
    for lang in phrase_bank.LANGS:
        entry = phrase_bank.options(lang)[0]
        r = client.post("/speak", json={"text": entry["target_text"], "lang": lang})
        assert r.headers["content-type"] == "audio/wav", (lang, r.text[:200])
        assert r.content[:4] == b"RIFF", lang
        print(f"  {lang}: {len(r.content)} bytes")


if __name__ == "__main__":
    test_languages()
    test_arbitrary_text_is_refused()
    test_bank_phrase_speaks()
    test_sentence_final_danda_still_matches()
    test_every_language_has_a_bank_and_speaks_it()
    print("\nPASS")
