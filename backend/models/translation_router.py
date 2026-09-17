"""TranslationRouter — Unified multilingual translation router.

Routes translation requests across:
- IndicTrans2 (Santali, Hindi, English, Mundari, Indic)
- Kurukh mT5 (Kurukh / Oraon bidirectional)
- Sadri Engine (Sadri / Nagpuri transfer)
- Ho/Munda Engine (North Munda transfer)
- Pivot Engine (English -> Hindi -> Target)
- Golden Phrase Bank (verified golden pairs)
"""

import logging
from typing import Dict, Any, List, Optional
from functools import lru_cache

from .segmentation import segment_text, reconstruct_text
from .script_validation import validate_script, contains_meetei_mayek
from .engines import (
    IndicTransEngine,
    KurukhEngine,
    SadriEngine,
    HoEngine,
    MundariEngine,
    PivotTranslationEngine,
    PhraseBankEngine,
    BaseTranslationEngine,
)

log = logging.getLogger(__name__)


def detect_source_language(text: str) -> str:
    """Detect source language from script characters."""
    if any("᱐" <= ch <= "᱿" for ch in text):
        return "sat_Olck"
    if any("ऀ" <= ch <= "ॿ" for ch in text):
        return "hin_Deva"
    if any("a" <= ch.lower() <= "z" for ch in text):
        return "eng_Latn"
    return "hin_Deva"


def normalize_code(code: str) -> str:
    c = code.strip()
    c_lower = c.lower()
    if c_lower in ("sat", "sat_olck"):
        return "sat_Olck"
    if c_lower in ("hin", "hin_deva", "hi"):
        return "hin_Deva"
    if c_lower in ("eng", "eng_latn", "en"):
        return "eng_Latn"
    if c_lower in ("kru", "kru_deva"):
        return "kru_Deva"
    if c_lower in ("sck", "sck_deva"):
        return "sck_Deva"
    if c_lower in ("unr", "unr_deva"):
        return "unr_Deva"
    if c_lower in ("hoc", "hoc_deva"):
        return "hoc_Deva"
    return c


class TranslationRouter:
    def __init__(self):
        self.indictrans = IndicTransEngine()
        self.kurukh = KurukhEngine()
        self.sadri = SadriEngine()
        self.ho = HoEngine()
        self.mundari = MundariEngine()
        self.phrase_bank = PhraseBankEngine()

        # Build pivot engines where step 1 is English -> Hindi
        self.pivot_kurukh = PivotTranslationEngine(self.indictrans, self.kurukh, pivot_lang="hin_Deva")
        self.pivot_sadri = PivotTranslationEngine(self.indictrans, self.sadri, pivot_lang="hin_Deva")
        self.pivot_ho = PivotTranslationEngine(self.indictrans, self.ho, pivot_lang="hin_Deva")
        self.pivot_mundari = PivotTranslationEngine(self.indictrans, self.mundari, pivot_lang="hin_Deva")

    def select_engine(self, source: str, target: str) -> Optional[BaseTranslationEngine]:
        # 1. Direct neural models
        if self.indictrans.supports(source, target):
            return self.indictrans
        if self.kurukh.supports(source, target):
            return self.kurukh

        # 2. Direct linguistic & rule transfer engines
        if self.sadri.supports(source, target):
            return self.sadri
        if self.ho.supports(source, target):
            return self.ho
        if self.mundari.supports(source, target):
            return self.mundari

        # 3. Pivot engines (e.g. English -> Hindi -> target)
        if self.pivot_kurukh.supports(source, target):
            return self.pivot_kurukh
        if self.pivot_sadri.supports(source, target):
            return self.pivot_sadri
        if self.pivot_ho.supports(source, target):
            return self.pivot_ho
        if self.pivot_mundari.supports(source, target):
            return self.pivot_mundari

        return None

    def translate(
        self,
        text: str,
        target: str = "sat",
        source: Optional[str] = None
    ) -> Dict[str, Any]:
        if not text or not text.strip():
            raise ValueError("Nothing to translate — the text was empty.")

        src_norm = normalize_code(source) if source else detect_source_language(text)
        tgt_norm = normalize_code(target)

        # 1. Select best engine
        engine = self.select_engine(src_norm, tgt_norm)
        if engine is None:
            return {
                "translation": None,
                "translated": None,
                "source_language": src_norm,
                "target_language": tgt_norm,
                "engine": None,
                "mode": "unsupported",
                "confidence": None,
                "script_contamination": False,
                "warnings": [f"No translation engine is currently available for {src_norm} -> {tgt_norm}"],
            }

        # 2. Segment into paragraph and sentence chunks
        segmented_items = segment_text(text)
        if not segmented_items:
            segmented_items = [(0, text.strip())]

        sentence_list = [item[1] for item in segmented_items]

        # 3. Run batched translation
        translated_sentences = engine.translate_sentences(sentence_list, src_norm, tgt_norm)

        # 4. Reconstruct paragraphs maintaining newlines
        translated_items = [(segmented_items[i][0], translated_sentences[i]) for i in range(len(segmented_items))]
        final_text = reconstruct_text(text, translated_items)

        # 5. Script validation & leakage checks
        is_valid, warnings = validate_script(final_text, tgt_norm)
        is_contaminated = contains_meetei_mayek(final_text)

        return {
            "translation": final_text,
            "translated": final_text,
            "source_language": src_norm,
            "target_language": tgt_norm,
            "engine": engine.name,
            "mode": engine.mode,
            "confidence": None,
            "script_contamination": is_contaminated,
            "warnings": warnings,
        }


@lru_cache(maxsize=1)
def get_router() -> TranslationRouter:
    return TranslationRouter()
