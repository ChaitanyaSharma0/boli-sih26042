"""Pivot translation engine.

Enables translation between language pairs that lack a direct model
by pivoting through an intermediate bridge language (primarily Hindi):
e.g. English -> Hindi -> Kurukh/Sadri/Ho
"""

from typing import List, Tuple
from .base import BaseTranslationEngine


class PivotTranslationEngine(BaseTranslationEngine):
    def __init__(self, step1_engine: BaseTranslationEngine, step2_engine: BaseTranslationEngine, pivot_lang: str = "hin"):
        self.step1_engine = step1_engine
        self.step2_engine = step2_engine
        self.pivot_lang = pivot_lang

    @property
    def name(self) -> str:
        return f"pivot({self.step1_engine.name} -> {self.step2_engine.name})"

    @property
    def mode(self) -> str:
        return "pivot"

    def supports(self, source: str, target: str) -> bool:
        return (
            self.step1_engine.supports(source, self.pivot_lang)
            and self.step2_engine.supports(self.pivot_lang, target)
        )

    def translate_sentences(self, sentences: List[str], source: str, target: str) -> List[str]:
        # Step 1: source -> pivot_lang
        intermediate = self.step1_engine.translate_sentences(sentences, source, self.pivot_lang)
        # Step 2: pivot_lang -> target
        final_translations = self.step2_engine.translate_sentences(intermediate, self.pivot_lang, target)
        return final_translations
