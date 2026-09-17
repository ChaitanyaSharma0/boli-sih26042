"""IndicTrans2 engine — neural sequence-to-sequence translation.

Supports:
- Santali (sat_Olck / sat)
- Hindi (hin_Deva / hin)
- English (eng_Latn / eng)
- Mundari (unr_Deva / unr)
- Bhojpuri, Magahi, Maithili, etc.
"""

import os
from typing import List, Tuple
from functools import lru_cache
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor

from .base import BaseTranslationEngine

CKPT = "ai4bharat/indictrans2-indic-indic-dist-320M"

FLORES_MAP = {
    "sat": "sat_Olck",
    "sat_olck": "sat_Olck",
    "hin": "hin_Deva",
    "hin_deva": "hin_Deva",
    "hi": "hin_Deva",
    "eng": "eng_Latn",
    "eng_latn": "eng_Latn",
    "en": "eng_Latn",
    "bho": "bho_Deva",
    "mag": "mag_Deva",
    "mai": "mai_Deva",
}


@lru_cache(maxsize=1)
def _load_model():
    if not os.getenv("HF_TOKEN"):
        raise RuntimeError("HF_TOKEN is not set. IndicTrans2 requires HF_TOKEN.")
    tok = AutoTokenizer.from_pretrained(CKPT, trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(CKPT, trust_remote_code=True)
    ip = IndicProcessor(inference=True)
    return tok, model, ip


class IndicTransEngine(BaseTranslationEngine):
    @property
    def name(self) -> str:
        return "ai4bharat/indictrans2-indic-indic-dist-320M"

    @property
    def mode(self) -> str:
        return "neural"

    def normalize_lang(self, code: str) -> str | None:
        return FLORES_MAP.get(code.lower().strip())

    def supports(self, source: str, target: str) -> bool:
        s = self.normalize_lang(source)
        t = self.normalize_lang(target)
        return bool(s and t and s != t)

    def translate_sentences(self, sentences: List[str], source: str, target: str) -> List[str]:
        if not sentences:
            return []

        src_flores = self.normalize_lang(source)
        tgt_flores = self.normalize_lang(target)
        if not src_flores or not tgt_flores:
            raise ValueError(f"Unsupported pair: {source} -> {target}")

        tok, model, ip = _load_model()
        batch = ip.preprocess_batch(sentences, src_lang=src_flores, tgt_lang=tgt_flores)
        enc = tok(batch, truncation=True, padding="longest", return_tensors="pt")
        with torch.no_grad():
            out = model.generate(**enc, max_length=256, num_beams=5, early_stopping=True)
        decoded = tok.batch_decode(out, skip_special_tokens=True)
        translated = ip.postprocess_batch(decoded, lang=tgt_flores)
        return translated
