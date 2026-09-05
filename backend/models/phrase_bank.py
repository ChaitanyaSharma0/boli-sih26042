"""The curated phrase bank — the honest substitute for translation into
Ho, Mundari, Kurukh and Sadri.

This module is the source of truth for the table documented in
DATA_DICTIONARY.md §2. It exists because these four languages have no
open parallel corpus and no translation model, from us or anyone else
(PRD.md §4). A fixed Hindi phrase maps to a known target string that
stays inside the TTS checkpoint's character set; nothing here is
generated, and nothing here is translation.

**Every entry is unverified by a native speaker.** `verified` stays
False until an actual speaker confirms an entry, and STATE.md records
whether that has happened. Do not flip it to True to make a screen look
better (RULES.md §2).

Adding entries is encouraged — more classroom topics make a better demo.
Each new one needs a Hindi source, a hand-constructed or speaker-given
target string in the script that checkpoint expects (models/tts.py
SCRIPTS), and `verified: False`.
"""

PHRASES = [
    {
        "id": 1,
        "lang": "hoc",
        "hindi_source": "पानी हमारा जीवन है",
        "target_text": "ଦା ଆଲେ ଜୀଉ ତାନା",  # Odia script
        "verified": False,
    },
    {
        "id": 2,
        "lang": "unr",
        "hindi_source": "पानी हमारा जीवन है",
        "target_text": "ଦା ଆଲେ ଜିଉ ତାନା",  # Odia script
        "verified": False,
    },
    {
        "id": 3,
        "lang": "kru",
        "hindi_source": "पानी हमारा जीवन है",
        "target_text": "अम्म हमक जीवन रअदा",
        "verified": False,
    },
    {
        "id": 4,
        "lang": "sck",
        "hindi_source": "पानी हमारा जीवन है",
        "target_text": "पानी हमन के जीवन हे",
        "verified": False,
    },
]

# The languages this bank covers — i.e. the ones with no translation model.
LANGS = sorted({p["lang"] for p in PHRASES})


def options(lang: str) -> list[dict]:
    """Every phrase available in `lang`, for the UI to offer as choices."""
    return [p for p in PHRASES if p["lang"] == lang]


def lookup(lang: str, text: str) -> dict | None:
    """Find the entry `text` refers to, by Hindi source or by target text.

    Lenient about which side the caller sends, strict about there being a
    match at all: an unmatched string returns None, and /speak turns that
    into a refusal rather than synthesising text nobody has checked.
    """
    wanted = " ".join(text.split())
    for p in options(lang):
        if wanted in (
            " ".join(p["hindi_source"].split()),
            " ".join(p["target_text"].split()),
        ):
            return p
    return None
