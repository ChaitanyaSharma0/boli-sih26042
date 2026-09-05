"""GET /languages — the capability list.

The frontend renders what each language can and cannot do from this
response and never hardcodes it (RULES.md §5), so this is the single
place the honesty boundary reaches the UI.

Capabilities are derived from the code that actually implements them —
the translation wrapper's supported targets, the phrase bank's languages
and the TTS model table — so a language cannot end up advertising
something no module backs. Adding a name below without adding a model
gets you "none", not a lie.
"""

from fastapi import APIRouter

from models import phrase_bank, translation, tts

router = APIRouter()

NAMES = {
    "sat": "Santali",
    "hoc": "Ho",
    "unr": "Mundari",
    "kru": "Kurukh",
    "sck": "Sadri",
}

NOTES = {
    "sat": "No TTS checkpoint exists anywhere for Santali.",
    "hoc": None,
    "unr": None,
    "kru": None,
    "sck": None,
}

# IndicTrans2 target codes are script-qualified (sat_Olck); ours are ISO.
_TRANSLATABLE = {t.split("_")[0] for t in translation.SUPPORTED_TARGETS}


def _capability(code: str) -> dict:
    if code in _TRANSLATABLE:
        translation_cap = "full"
    elif code in phrase_bank.LANGS:
        translation_cap = "phrase_bank"
    else:
        translation_cap = "none"

    return {
        "code": code,
        "name": NAMES[code],
        "translation": translation_cap,
        "tts": "full" if code in tts.MODELS else "none",
        "note": NOTES[code],
    }


@router.get("/languages")
def languages():
    return [_capability(code) for code in NAMES]
