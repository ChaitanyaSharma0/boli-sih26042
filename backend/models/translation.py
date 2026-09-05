"""IndicTrans2 wrapper — Hindi -> Santali (Ol Chiki) ONLY.

Ported from research/sih_2026.ipynb cell 21, which is the run that
produced the recorded long-vs-short contrast.

Scope boundary (PRD.md §4, RULES.md §2): `sat_Olck` is the only target
this function will ever accept. Ho/Mundari/Kurukh/Sadri have no parallel
corpus and no model; asking for them raises, it never falls through to a
plausible-looking wrong answer.
"""

import os
from functools import lru_cache

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from IndicTransToolkit.processor import IndicProcessor

CKPT = "ai4bharat/indictrans2-indic-indic-dist-320M"  # gated, needs HF_TOKEN
SRC_LANG = "hin_Deva"
SUPPORTED_TARGETS = ("sat_Olck",)

# Meetei Mayek block. IndicTrans2 emits these characters when a Hindi word
# is outside its Santali training distribution (गेहूँ, धान) — the model
# falls back to another Indic script mid-sentence. Detecting it is what
# makes the pedagogy argument demonstrable rather than anecdotal.
_MEETEI_MAYEK = ((0xABC0, 0xABFF), (0xAAE0, 0xAAFF))


def contains_meetei_mayek(text: str) -> bool:
    return any(lo <= ord(ch) <= hi for ch in text for lo, hi in _MEETEI_MAYEK)


@lru_cache(maxsize=1)
def _load():
    """Load once, keep for the process lifetime (ARCHITECTURE.md §4)."""
    # Auth comes from the HF_TOKEN environment variable, never a token=
    # kwarg. This checkpoint ships remote code, and transformers 4.45.2
    # drops an explicit token on the trust_remote_code fetch path, so
    # passing one actually causes a 401 that env-var auth does not — see
    # RULES.md §8. main.py calls load_dotenv() before importing this module.
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


def translate(text: str, target: str = "sat_Olck") -> str:
    if target not in SUPPORTED_TARGETS:
        raise ValueError(
            f"No translation model exists for '{target}'. Only {SUPPORTED_TARGETS[0]} "
            "(Santali) has a parallel corpus — see PRD.md §4. Use the phrase bank."
        )
    if not text.strip():
        raise ValueError("Nothing to translate — the text was empty.")

    tok, model, ip = _load()
    batch = ip.preprocess_batch([text], src_lang=SRC_LANG, tgt_lang=target)
    enc = tok(batch, truncation=True, padding="longest", return_tensors="pt")
    with torch.no_grad():
        out = model.generate(**enc, max_length=256, num_beams=5)
    decoded = tok.batch_decode(out, skip_special_tokens=True)
    translated = ip.postprocess_batch(decoded, lang=target)[0]

    if not translated.strip():
        raise RuntimeError("Translation came back empty — try a shorter sentence.")
    return translated
