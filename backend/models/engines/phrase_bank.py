"""Phrase bank exact golden match engine."""

from typing import List
from .base import BaseTranslationEngine
from models import phrase_bank


class PhraseBankEngine(BaseTranslationEngine):
    @property
    def name(self) -> str:
        return "boli/curated-phrase-bank"

    @property
    def mode(self) -> str:
        return "phrase_bank"

    def supports(self, source: str, target: str) -> bool:
        s = source.lower().split('_')[0]
        t = target.lower().split('_')[0]
        return s == 'hin' and t in phrase_bank.LANGS

    def translate_sentences(self, sentences: List[str], source: str, target: str) -> List[str]:
        t = target.lower().split('_')[0]
        results = []
        for s in sentences:
            match = phrase_bank.lookup(t, s)
            if match:
                results.append(match['target_text'])
            else:
                results.append("")
        return results
