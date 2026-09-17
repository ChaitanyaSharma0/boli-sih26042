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

import numpy as np
import scipy.io.wavfile
import torch
from transformers import AutoTokenizer, VitsModel

# Santali uses AI4Bharat Indic Parler-TTS with Ol Chiki script.
# Ho, Mundari, Kurukh, and Sadri use Meta MMS-TTS checkpoints.
MODELS = {
    "sat": "ai4bharat/indic-parler-tts",
    "hoc": "facebook/mms-tts-hoc",
    "unr": "facebook/mms-tts-unr",
    "kru": "facebook/mms-tts-kru",
    "sck": "facebook/mms-tts-sck",
}

# What script each checkpoint was actually trained on — needed to write
# usable phrase-bank text, and to explain the error when input is wrong.
SCRIPTS = {
    "sat": "Ol Chiki",
    "hoc": "Odia",
    "unr": "Odia",
    "kru": "Devanagari",
    "sck": "Devanagari",
}

DEFAULT_SANTALI_SPEAKER = (
    "Arjun's voice is very clear and high quality, spoken at a moderate pace."
)


def _ensure_dac_patched():
    """transformers 4.45.2 has DacModel.decode missing = None on the first positional arg."""
    try:
        from transformers.models.dac.modeling_dac import DacModel

        if not getattr(DacModel, "_boli_patched", False):
            orig_decode = DacModel.decode

            def _patched_decode(
                self,
                quantized_representation=None,
                audio_codes=None,
                return_dict=None,
            ):
                return orig_decode(
                    self,
                    quantized_representation,
                    audio_codes=audio_codes,
                    return_dict=return_dict,
                )

            DacModel.decode = _patched_decode
            DacModel._boli_patched = True
    except Exception:
        pass


@lru_cache(maxsize=1)
def _load_parler_tts():
    """Load once per process lifetime and stay cached (ARCHITECTURE.md §4)."""
    _ensure_dac_patched()
    from parler_tts import ParlerTTSForConditionalGeneration

    primary = MODELS["sat"]
    fallback = "RXD03/indic-parler-tts"

    model = None
    prompt_tok = None
    try:
        model = ParlerTTSForConditionalGeneration.from_pretrained(primary)
        prompt_tok = AutoTokenizer.from_pretrained(primary)
    except Exception:
        model = ParlerTTSForConditionalGeneration.from_pretrained(fallback)
        prompt_tok = AutoTokenizer.from_pretrained(fallback)

    model.eval()
    desc_model_path = model.config.text_encoder._name_or_path
    desc_tok = AutoTokenizer.from_pretrained(desc_model_path)
    return model, prompt_tok, desc_tok


@lru_cache(maxsize=4)
def _load_mms(lang: str):
    """Load once per language, keep for the process lifetime (ARCHITECTURE.md §4)."""
    ckpt = MODELS[lang]
    model = VitsModel.from_pretrained(ckpt)
    model.eval()
    return model, AutoTokenizer.from_pretrained(ckpt)


def warmup(langs=None):
    for lang in langs or MODELS:
        if lang == "sat":
            _load_parler_tts()
        else:
            _load_mms(lang)


def deva_to_odia(text: str, target_lang: str = "hoc") -> str:
    """Convert Devanagari text into Odia script for Ho and Mundari MMS-TTS.

    Meta facebook/mms-tts-hoc and facebook/mms-tts-unr checkpoints were trained
    on Odia script tokens. This function maps Devanagari (U+0900..U+097F) to
    Odia (U+0B00..U+0B7F) via standard Unicode offset (+0x0200) and handles
    vowel decompositions, missing graphemes, and language-specific phonological
    substitutions for the checkpoint vocabularies.
    """
    vowel_replacements = {
        "\u0908": "\u0907",           # ई -> इ
        "\u090A": "\u0909",           # ऊ -> उ
        "\u090B": "\u0930\u093F",     # ऋ -> रि
        "\u0910": "\u0905\u0907",     # ऐ -> अइ
        "\u0913": "\u0905\u094B",     # ओ -> अो
        "\u0914": "\u0905\u0909",     # औ -> अउ
    }
    for k, v in vowel_replacements.items():
        text = text.replace(k, v)

    res = []
    for ch in text:
        cp = ord(ch)
        if 0x0901 <= cp <= 0x094D:
            res.append(chr(cp + 0x0200))
        elif 0x0966 <= cp <= 0x096F:
            res.append(chr(cp + 0x0200))
        elif ch in ("\u0964", "\u0965"):
            res.append(" ")
        else:
            res.append(ch)
    odia_str = "".join(res)

    if target_lang == "hoc":
        hoc_map = {
            "\u0B18": "\u0B17",  # ଘ -> ଗ
            "\u0B20": "\u0B1F",  # ଠ -> ଟ
            "\u0B27": "\u0B26",  # ଧ -> ଦ
            "\u0B1B": "\u0B1A",  # ଛ -> ଚ
            "\u0B1D": "\u0B1C",  # ଝ -> ଜ
            "\u0B3C": "",        # nukta dropped
            "\u0B37": "\u0B38",  # ଷ -> ସ
            "\u0B2F": "\u0B5F",  # ଯ -> ୟ
            "\u0B42": "\u0B41",  # ୂ -> ୁ
        }
        for k, v in hoc_map.items():
            odia_str = odia_str.replace(k, v)
    elif target_lang == "unr":
        unr_map = {
            "\u0B33": "\u0B32",  # ଳ -> ଲ
            "\u0B48": "\u0B47",  # ୈ -> େ
            "\u0B4C": "\u0B4B",  # ୌ -> ୋ
            "\u0B42": "\u0B41",  # ୂ -> ୁ
            "\u0B43": "\u0B3F",  # ୃ -> ି
        }
        for k, v in unr_map.items():
            odia_str = odia_str.replace(k, v)

    return odia_str


def synthesize(text: str, lang: str, speaker_desc: str = None) -> bytes:
    """Return wav bytes. Raises ValueError on an unsupported or unspeakable input."""
    if lang not in MODELS:
        raise ValueError(
            f"No TTS checkpoint exists for '{lang}'. Available: {', '.join(MODELS)}."
        )

    if lang == "sat":
        model, prompt_tok, desc_tok = _load_parler_tts()
        prompt_inputs = prompt_tok(text, return_tensors="pt")
        if prompt_inputs["input_ids"].shape[1] == 0:
            raise ValueError(
                f"None of this text is in the {SCRIPTS[lang]} script, so there is nothing to speak."
            )

        description = speaker_desc or DEFAULT_SANTALI_SPEAKER
        desc_inputs = desc_tok(description, return_tensors="pt")

        with torch.no_grad():
            generation = model.generate(
                input_ids=desc_inputs.input_ids,
                prompt_input_ids=prompt_inputs.input_ids,
            )

        audio_arr = generation.cpu().numpy().squeeze()
        max_val = np.max(np.abs(audio_arr))
        if max_val > 0:
            audio_norm = audio_arr / max(max_val, 1.0)
        else:
            audio_norm = audio_arr
        audio_int16 = (audio_norm * 32767).astype(np.int16)

        buf = io.BytesIO()
        scipy.io.wavfile.write(
            buf, rate=model.config.sampling_rate, data=audio_int16
        )
        return buf.getvalue()

    # Preprocess Devanagari to Odia script for Ho and Mundari MMS models
    target_text = text
    if lang in ("hoc", "unr"):
        if any(0x0900 <= ord(c) <= 0x097F for c in text):
            target_text = deva_to_odia(text, target_lang=lang)

    # MMS synthesis for hoc, unr, kru, sck
    model, tok = _load_mms(lang)
    inputs = tok(target_text, return_tensors="pt")
    if inputs["input_ids"].shape[1] == 0:
        raise ValueError(
            f"None of this text is in the {SCRIPTS[lang]} script that the {lang} "
            "voice was trained on, so there is nothing to speak."
        )

    with torch.no_grad():
        waveform = model(**inputs).waveform.cpu().float().numpy().squeeze()

    max_val = np.max(np.abs(waveform))
    if max_val > 0:
        audio_norm = waveform / max(max_val, 1.0)
    else:
        audio_norm = waveform
    audio_int16 = (audio_norm * 32767).astype(np.int16)

    buf = io.BytesIO()
    scipy.io.wavfile.write(
        buf, rate=model.config.sampling_rate, data=audio_int16
    )
    return buf.getvalue()
