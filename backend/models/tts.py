"""MMS-TTS wrappers — real speech for Ho, Mundari, Kurukh, Sadri.

Ported from research/sih_2026.ipynb cell 8 (the run that produced the
four working wav files).

Each checkpoint expects a specific script that is undocumented on its
model card — Ho and Mundari were trained on Odia, not the Devanagari
Jharkhand actually writes them in (RULES.md §8). Feeding a checkpoint
the wrong script tokenises to nothing, so that case raises rather than
returning a silent empty wav.
"""

import io
from functools import lru_cache

import scipy.io.wavfile
import torch
from transformers import AutoTokenizer, VitsModel

# DATA_DICTIONARY.md §1. Santali is absent on purpose: no TTS checkpoint
# exists for it anywhere, from anyone. Do not add one without updating
# PRD.md and DATA_DICTIONARY.md first.
MODELS = {
    "hoc": "facebook/mms-tts-hoc",
    "unr": "facebook/mms-tts-unr",
    "kru": "facebook/mms-tts-kru",
    "sck": "facebook/mms-tts-sck",
}

# What script each checkpoint was actually trained on — needed to write
# usable phrase-bank text, and to explain the error when input is wrong.
SCRIPTS = {"hoc": "Odia", "unr": "Odia", "kru": "Devanagari", "sck": "Devanagari"}


@lru_cache(maxsize=len(MODELS))
def _load(lang: str):
    """Load once per language, keep for the process lifetime (ARCHITECTURE.md §4)."""
    ckpt = MODELS[lang]
    model = VitsModel.from_pretrained(ckpt)
    model.eval()
    return model, AutoTokenizer.from_pretrained(ckpt)


def warmup(langs=None):
    for lang in langs or MODELS:
        _load(lang)


def synthesize(text: str, lang: str) -> bytes:
    """Return wav bytes. Raises ValueError on an unsupported or unspeakable input."""
    if lang not in MODELS:
        raise ValueError(
            f"No TTS checkpoint exists for '{lang}'. Available: {', '.join(MODELS)}."
        )

    model, tok = _load(lang)
    inputs = tok(text, return_tensors="pt")
    if inputs["input_ids"].shape[1] == 0:
        raise ValueError(
            f"None of this text is in the {SCRIPTS[lang]} script that the {lang} "
            "voice was trained on, so there is nothing to speak."
        )

    with torch.no_grad():
        waveform = model(**inputs).waveform

    buf = io.BytesIO()
    scipy.io.wavfile.write(
        buf, rate=model.config.sampling_rate, data=waveform.float().numpy().T
    )
    return buf.getvalue()
