"""The curated phrase bank — the honest substitute for translation into
Ho, Mundari, Kurukh and Sadri.

This module is the source of truth for the table documented in
DATA_DICTIONARY.md §2. It exists because these four languages have no
open parallel corpus and no translation model, from us or anyone else
(PRD.md §4). A fixed Hindi phrase maps to a known target string that
stays inside the TTS checkpoint's character set; nothing here is
generated, and nothing here is translation.

**Verification.** On 2026-09-18 every entry below was checked
individually by native speakers: two to three college students from
Jharkhand, whose names are withheld at their request (VERIFICATION holds
the record). All 20 were confirmed with no corrections, including the
three phrases whose Ho and Mundari strings are identical. `verified` is
per entry, so a phrase added later starts False and the UI says "pending
validation" for its language until a speaker checks it (RULES.md §2).

Verified means a speaker confirmed this Hindi phrase and this target
string match. It does not make BOLI translate: text that is not in the
bank is still refused by /speak.

Adding entries is encouraged. Each new one needs a Hindi source, a
speaker-given target string in the script that checkpoint expects
(models/tts.py SCRIPTS), and `verified: False` until it is checked.
"""

import re

# Who checked the bank, kept with the data it vouches for.
VERIFICATION = {
    "date": "2026-09-18",
    "by": "Native-speaker college students from Jharkhand (2-3 people); "
    "names withheld at their request",
    "scope": "All 20 entries, each checked individually; no corrections needed",
}

PHRASES = [
    # 1. पानी हमारा जीवन है (Water is our life)
    {
        "id": 1,
        "lang": "hoc",
        "hindi_source": "पानी हमारा जीवन है",
        "target_text": "ଦା ଆଲେ ଜୀଉ ତାନା",  # Odia script
        "verified": True,
    },
    {
        "id": 2,
        "lang": "unr",
        "hindi_source": "पानी हमारा जीवन है",
        "target_text": "ଦା ଆଲେ ଜିଉ ତାନା",  # Odia script
        "verified": True,
    },
    {
        "id": 3,
        "lang": "kru",
        "hindi_source": "पानी हमारा जीवन है",
        "target_text": "अम्म हमक जीवन रअदा",
        "verified": True,
    },
    {
        "id": 4,
        "lang": "sck",
        "hindi_source": "पानी हमारा जीवन है",
        "target_text": "पानी हमन के जीवन हे",
        "verified": True,
    },
    # 2. नमस्ते (Classroom greeting)
    {
        "id": 5,
        "lang": "hoc",
        "hindi_source": "नमस्ते",
        "target_text": "ଜୋହାର",
        "verified": True,
    },
    {
        "id": 6,
        "lang": "unr",
        "hindi_source": "नमस्ते",
        "target_text": "ଜୋହାର",
        "verified": True,
    },
    {
        "id": 7,
        "lang": "kru",
        "hindi_source": "नमस्ते",
        "target_text": "जोहार",
        "verified": True,
    },
    {
        "id": 8,
        "lang": "sck",
        "hindi_source": "नमस्ते",
        "target_text": "जोहार",
        "verified": True,
    },
    # 3. किताब खोलो (Open book)
    {
        "id": 9,
        "lang": "hoc",
        "hindi_source": "किताब खोलो",
        "target_text": "ପୁଥି ଉଗାଡ଼ା",
        "verified": True,
    },
    {
        "id": 10,
        "lang": "unr",
        "hindi_source": "किताब खोलो",
        "target_text": "ପୁଥି ଉଗାଡ଼ା",
        "verified": True,
    },
    {
        "id": 11,
        "lang": "kru",
        "hindi_source": "किताब खोलो",
        "target_text": "किताब उग्गड़ा",
        "verified": True,
    },
    {
        "id": 12,
        "lang": "sck",
        "hindi_source": "किताब खोलो",
        "target_text": "किताब खोला",
        "verified": True,
    },
    # 4. यहाँ बैठो (Sit here)
    {
        "id": 13,
        "lang": "hoc",
        "hindi_source": "यहाँ बैठो",
        "target_text": "ନେରେ ଦୁବୁ ମେ",
        "verified": True,
    },
    {
        "id": 14,
        "lang": "unr",
        "hindi_source": "यहाँ बैठो",
        "target_text": "ନେରେ ଦୁବୁ ମେ",
        "verified": True,
    },
    {
        "id": 15,
        "lang": "kru",
        "hindi_source": "यहाँ बैठो",
        "target_text": "इस्सने उक्का",
        "verified": True,
    },
    {
        "id": 16,
        "lang": "sck",
        "hindi_source": "यहाँ बैठो",
        "target_text": "इहाँ बैठा",
        "verified": True,
    },
    # 5. स्कूल चलो (Let's go to school)
    {
        "id": 17,
        "lang": "hoc",
        "hindi_source": "स्कूल चलो",
        "target_text": "ଇସ୍କୁଲ ସେନୋଃ ମେ",
        "verified": True,
    },
    {
        "id": 18,
        "lang": "unr",
        "hindi_source": "स्कूल चलो",
        "target_text": "ଇସ୍କୁଲ ସେନୋଃ ମେ",
        "verified": True,
    },
    {
        "id": 19,
        "lang": "kru",
        "hindi_source": "स्कूल चलो",
        "target_text": "स्कूल कला",
        "verified": True,
    },
    {
        "id": 20,
        "lang": "sck",
        "hindi_source": "स्कूल चलो",
        "target_text": "स्कूल चला",
        "verified": True,
    },
]

# The languages this bank covers — i.e. the ones with no translation model.
LANGS = sorted({p["lang"] for p in PHRASES})


def verified_for(lang: str) -> bool:
    """True only if every phrase `lang` has has been checked by a speaker."""
    entries = options(lang)
    return bool(entries) and all(p["verified"] for p in entries)


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
