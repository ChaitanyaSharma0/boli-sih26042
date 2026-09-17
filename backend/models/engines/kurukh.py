"""Kurukh neural translation engine.

Uses fine-tuned mT5 models trained on Bharatavani Kurukh/Oraon lexicon
and community corpora:
- ankitklakra/hindi-to-kurukh (Hindi -> Kurukh)
- ankitklakra/kurukh-to-hindi (Kurukh -> Hindi)
"""

from functools import lru_cache
from typing import List
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from .base import BaseTranslationEngine

H2K_MODEL = "ankitklakra/hindi-to-kurukh"
K2H_MODEL = "ankitklakra/kurukh-to-hindi"


@lru_cache(maxsize=1)
def _load_h2k():
    tok = AutoTokenizer.from_pretrained(H2K_MODEL)
    model = AutoModelForSeq2SeqLM.from_pretrained(H2K_MODEL)
    model.eval()
    return tok, model


@lru_cache(maxsize=1)
def _load_k2h():
    tok = AutoTokenizer.from_pretrained(K2H_MODEL)
    model = AutoModelForSeq2SeqLM.from_pretrained(K2H_MODEL)
    model.eval()
    return tok, model


class KurukhEngine(BaseTranslationEngine):
    @property
    def name(self) -> str:
        return "ankitklakra/kurukh-mt5"

    @property
    def mode(self) -> str:
        return "neural"

    def supports(self, source: str, target: str) -> bool:
        s = source.lower().split('_')[0]
        t = target.lower().split('_')[0]
        return (s == 'hin' and t == 'kru') or (s == 'kru' and t == 'hin')

    def translate_sentences(self, sentences: List[str], source: str, target: str) -> List[str]:
        if not sentences:
            return []

        s = source.lower().split('_')[0]
        t = target.lower().split('_')[0]

        if s == 'hin' and t == 'kru':
            tok, model = _load_h2k()
        elif s == 'kru' and t == 'hin':
            tok, model = _load_k2h()
        else:
            raise ValueError(f"KurukhEngine does not support {source} -> {target}")

        inputs = tok(sentences, padding=True, truncation=True, return_tensors="pt")
        with torch.no_grad():
            out = model.generate(
                **inputs,
                max_length=128,
                num_beams=5,
                repetition_penalty=2.0,
                no_repeat_ngram_size=2,
                early_stopping=True,
            )
        decoded = tok.batch_decode(out, skip_special_tokens=True)
        return [d.strip() for d in decoded]
