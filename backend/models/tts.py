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
        buf = io.BytesIO()
        scipy.io.wavfile.write(
            buf, rate=model.config.sampling_rate, data=audio_arr
        )
        return buf.getvalue()

    # MMS synthesis for hoc, unr, kru, sck
    model, tok = _load_mms(lang)
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

