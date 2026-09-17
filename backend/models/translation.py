"""IndicTrans2 translation engine — supports arbitrary sentences, multi-sentence
passages, paragraphs, and language auto-detection for supported languages.
"""

import os
import re
from functools import lru_cache

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from IndicTransToolkit.processor import IndicProcessor

CKPT = "ai4bharat/indictrans2-indic-indic-dist-320M"  # gated, needs HF_TOKEN

# Supported FLORES language targets
LANG_MAP = {
    "sat": "sat_Olck",
    "sat_Olck": "sat_Olck",
    "hin": "hin_Deva",
    "hin_Deva": "hin_Deva",
    "hi": "hin_Deva",
    "en": "eng_Latn",
    "eng": "eng_Latn",
    "eng_Latn": "eng_Latn",
    "bho": "bho_Deva",
    "mag": "mag_Deva",
    "mai": "mai_Deva",
    "ben": "ben_Beng",
    "ory": "ory_Orya",
}

SUPPORTED_TARGETS = tuple(LANG_MAP.keys())

# Meetei Mayek block. IndicTrans2 emits these characters when a Hindi word
# is outside its Santali training distribution (गेहूँ, धान) — the model
# falls back to another Indic script mid-sentence. Detecting it is what
# makes the pedagogy argument demonstrable rather than anecdotal.
_MEETEI_MAYEK = ((0xABC0, 0xABFF), (0xAAE0, 0xAAFF))


def contains_meetei_mayek(text: str) -> bool:
    return any(lo <= ord(ch) <= hi for ch in text for lo, hi in _MEETEI_MAYEK)


def detect_source_lang(text: str) -> str:
    """Detect source language from script characters."""
    if any("\u1c50" <= ch <= "\u1c7f" for ch in text):
        return "sat_Olck"
    if any("\u0900" <= ch <= "\u097f" for ch in text):
        return "hin_Deva"
    if any("a" <= ch.lower() <= "z" for ch in text):
        return "eng_Latn"
    return "hin_Deva"


@lru_cache(maxsize=1)
def _load():
    """Load once, keep for the process lifetime (ARCHITECTURE.md §4)."""
    if not os.getenv("HF_TOKEN"):
        raise RuntimeError(
            "HF_TOKEN is not set. IndicTrans2 is a gated repo — put a Read "
            "token in backend/.env (see .env.example) and accept the terms at "
            f"https://huggingface.co/{CKPT}."
        )
    tok = AutoTokenizer.from_pretrained(CKPT, trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(CKPT, trust_remote_code=True)
    model.eval()
    return tok, model, IndicProcessor(inference=True)


def warmup():
    _load()


def translate(text: str, target: str = "sat_Olck", source: str | None = None) -> str:
    if target not in LANG_MAP:
        raise ValueError(
            f"No translation model exists for '{target}'. Supported targets include: "
            "Santali (sat_Olck / sat), Hindi (hin_Deva / hin), English (eng_Latn / eng). "
            "Ho, Mundari, Kurukh and Sadri are low-resource dialects served by the curated "
            "phrase bank via /speak."
        )
    if not text.strip():
        raise ValueError("Nothing to translate — the text was empty.")

    tgt_flores = LANG_MAP[target]
    src_flores = LANG_MAP[source] if source and source in LANG_MAP else detect_source_lang(text)

    tok, model, ip = _load()

    # Preserve paragraph line breaks and multi-sentence structure cleanly
    lines = text.split("\n")
    translated_lines = []

    for line in lines:
        if not line.strip():
            translated_lines.append("")
            continue

        # Split line into individual sentences using sentence boundary punctuation
        sents = [s.strip() for s in re.split(r"(?<=[.?!।])\s+", line) if s.strip()]
        if not sents:
            sents = [line.strip()]

        batch = ip.preprocess_batch(sents, src_lang=src_flores, tgt_lang=tgt_flores)
        enc = tok(batch, truncation=True, padding="longest", return_tensors="pt")
        with torch.no_grad():
            out = model.generate(**enc, max_length=256, num_beams=5, early_stopping=True)
        decoded = tok.batch_decode(out, skip_special_tokens=True)
        t_sents = ip.postprocess_batch(decoded, lang=tgt_flores)
        translated_lines.append(" ".join(t_sents))

    result = "\n".join(translated_lines)
    if not result.strip():
        raise RuntimeError("Translation came back empty — try a shorter sentence.")
    return result

