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

# Supported target languages across all integrated engines:
# Santali (IndicTrans2), Kurukh (mT5), Mundari (North Munda), Sadri (Magadhan), Ho (North Munda), Hindi, English
SUPPORTED_TARGETS = (
    "sat", "sat_Olck",
    "kru", "kru_Deva",
    "unr", "unr_Deva",
    "sck", "sck_Deva",
    "hoc", "hoc_Deva",
    "hin", "hin_Deva", "hi",
    "eng", "eng_Latn", "en",
    "bho", "bho_Deva",
    "mag", "mag_Deva",
    "mai", "mai_Deva",
    "ben", "ben_Beng",
    "ory", "ory_Orya",
)

# Meetei Mayek block. IndicTrans2 emits these characters when a Hindi word
# is outside its Santali training distribution (गेहूँ, धान) — the model
# falls back to another Indic script mid-sentence.
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


def warmup():
    """Warm up translation models at startup."""
    try:
        from .translation_router import get_router
        router = get_router()
        # Warm up IndicTrans2 if HF_TOKEN is present
        if os.getenv("HF_TOKEN"):
            router.indictrans.translate_sentences(["नमस्ते"], "hin_Deva", "sat_Olck")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Translation warmup skipped: %s", e)


def translate_detailed(text: str, target: str = "sat_Olck", source: str | None = None) -> dict:
    """Translate text and return full routing and verification metadata."""
    from .translation_router import get_router
    router = get_router()
    return router.translate(text, target=target, source=source)


def translate(text: str, target: str = "sat_Olck", source: str | None = None) -> str:
    """Translate text returning the translated string (backward compatible)."""
    res = translate_detailed(text, target=target, source=source)
    if not res.get("translated"):
        raise RuntimeError(f"Translation came back empty for target '{target}'.")
    return res["translated"]

