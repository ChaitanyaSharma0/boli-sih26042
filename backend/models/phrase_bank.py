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

import re

PHRASES = [
    # 1. पानी हमारा जीवन है (Water is our life)
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
    # 2. नमस्ते (Classroom greeting)
    {
        "id": 5,
        "lang": "hoc",
        "hindi_source": "नमस्ते",
        "target_text": "ଜୋହାର",
        "verified": False,
    },
    {
        "id": 6,
        "lang": "unr",
        "hindi_source": "नमस्ते",
        "target_text": "ଜୋହାର",
        "verified": False,
    },
    {
        "id": 7,
        "lang": "kru",
        "hindi_source": "नमस्ते",
        "target_text": "जोहार",
        "verified": False,
    },
    {
        "id": 8,
        "lang": "sck",
        "hindi_source": "नमस्ते",
        "target_text": "जोहार",
        "verified": False,
    },
    # 3. किताब खोलो (Open book)
    {
        "id": 9,
        "lang": "hoc",
        "hindi_source": "किताब खोलो",
        "target_text": "ପୁଥି ଉଗାଡ଼ା",
        "verified": False,
    },
    {
        "id": 10,
        "lang": "unr",
        "hindi_source": "किताब खोलो",
        "target_text": "ପୁଥି ଉଗାଡ଼ା",
        "verified": False,
    },
    {
        "id": 11,
        "lang": "kru",
        "hindi_source": "किताब खोलो",
        "target_text": "किताब उग्गड़ा",
        "verified": False,
    },
    {
        "id": 12,
        "lang": "sck",
        "hindi_source": "किताब खोलो",
        "target_text": "किताब खोला",
        "verified": False,
    },
    # 4. यहाँ बैठो (Sit here)
    {
        "id": 13,
        "lang": "hoc",
        "hindi_source": "यहाँ बैठो",
        "target_text": "ନେରେ ଦୁବୁ ମେ",
        "verified": False,
    },
    {
        "id": 14,
        "lang": "unr",
        "hindi_source": "यहाँ बैठो",
        "target_text": "ନେରେ ଦୁବୁ ମେ",
        "verified": False,
    },
    {
        "id": 15,
        "lang": "kru",
        "hindi_source": "यहाँ बैठो",
        "target_text": "इस्सने उक्का",
        "verified": False,
    },
    {
        "id": 16,
        "lang": "sck",
        "hindi_source": "यहाँ बैठो",
        "target_text": "इहाँ बैठा",
        "verified": False,
    },
    # 5. स्कूल चलो (Let's go to school)
    {
        "id": 17,
        "lang": "hoc",
        "hindi_source": "स्कूल चलो",
        "target_text": "ଇସ୍କୁଲ ସେନୋଃ ମେ",
        "verified": False,
    },
    {
        "id": 18,
        "lang": "unr",
        "hindi_source": "स्कूल चलो",
        "target_text": "ଇସ୍କୁଲ ସେନୋଃ ମେ",
        "verified": False,
    },
    {
        "id": 19,
        "lang": "kru",
        "hindi_source": "स्कूल चलो",
        "target_text": "स्कूल कला",
        "verified": False,
    },
    {
        "id": 20,
        "lang": "sck",
        "hindi_source": "स्कूल चलो",
        "target_text": "स्कूल चला",
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
    wanted = _normalise(text)
    for p in options(lang):
        if wanted in (_normalise(p["hindi_source"]), _normalise(p["target_text"])):
            return p
    return None


# Punctuation only — never letters, matras or the visarga (ः / ଃ), which
# are part of the words themselves.
_PUNCT = re.compile(r"[.!?,।॥:;\-_\"'()]+")


def _normalise(text: str) -> str:
    """Drop punctuation anywhere and collapse whitespace.

    The chapter splitter, OCR and typing add or omit a danda, commas and
    quotes at will. "पानी हमारा जीवन है।" and "यहाँ, बैठो" are the bank's
    phrases; the words themselves still have to match exactly.
    """
    return " ".join(_PUNCT.sub(" ", text).split())
