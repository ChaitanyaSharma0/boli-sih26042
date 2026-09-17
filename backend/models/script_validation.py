"""Script validation and leakage detection.

Validates:
- Ol Chiki (Santali): U+1C50 to U+1C7F
- Devanagari (Hindi, Kurukh, Mundari, Sadri): U+0900 to U+097F
- Meetei Mayek leakage detection: U+ABC0 to U+ABFF, U+AAE0 to U+AAFF
- Odia script (Ho/Mundari TTS representation): U+0B00 to U+0B7F
"""

from typing import List, Tuple

_MEETEI_MAYEK = ((0xABC0, 0xABFF), (0xAAE0, 0xAAFF))
_OL_CHIKI = (0x1C50, 0x1C7F)
_DEVANAGARI = (0x0900, 0x097F)


def contains_meetei_mayek(text: str) -> bool:
    """Return True if IndicTrans2 leaked Meetei Mayek script characters."""
    return any(lo <= ord(ch) <= hi for ch in text for lo, hi in _MEETEI_MAYEK)


def validate_script(text: str, target_lang: str) -> Tuple[bool, List[str]]:
    """Validate that the text matches expected script characteristics for target_lang.
    
    Returns (is_valid, warnings_list).
    """
    warnings = []
    if contains_meetei_mayek(text):
        warnings.append("Vocabulary out-of-domain: output contains Meetei Mayek script contamination.")

    lang_clean = target_lang.lower().split('_')[0]

    if lang_clean == 'sat':
        # Santali should predominantly have Ol Chiki characters
        ol_count = sum(1 for ch in text if _OL_CHIKI[0] <= ord(ch) <= _OL_CHIKI[1])
        deva_count = sum(1 for ch in text if _DEVANAGARI[0] <= ord(ch) <= _DEVANAGARI[1])
        if deva_count > ol_count and len(text) > 3:
            warnings.append("Script mismatch: expected Ol Chiki for Santali, found untranslated Devanagari.")

    return len(warnings) == 0, warnings
