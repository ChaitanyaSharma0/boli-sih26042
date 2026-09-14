"""Meta MMS ASR — Speech-to-Text for Hindi.

Transcribes spoken Hindi audio from the teacher into Devanagari text.
Uses Meta's MMS (Massively Multilingual Speech) ASR checkpoint
(`facebook/mms-1b-all` or `facebook/mms-100m`), configured for Hindi (`hin`).

Follows the caching and warmup pattern in ARCHITECTURE.md §4 (loaded once at
startup, never per request).
"""

import io
import logging
from functools import lru_cache

import numpy as np
import scipy.io.wavfile as wav

log = logging.getLogger(__name__)

MMS_ASR_MODEL = "facebook/mms-1b-all"
TARGET_LANG = "hin"

_WAV_HEADER = b"RIFF"


@lru_cache(maxsize=1)
def _load_model():
    """Load the MMS ASR processor and model checkpoint."""
    from transformers import AutoProcessor, Wav2Vec2ForCTC

    log.warning("Loading ASR model %s (target: %s)...", MMS_ASR_MODEL, TARGET_LANG)
    processor = AutoProcessor.from_pretrained(MMS_ASR_MODEL)
    model = Wav2Vec2ForCTC.from_pretrained(MMS_ASR_MODEL)
    try:
        processor.tokenizer.set_target_lang(TARGET_LANG)
        model.load_adapter(TARGET_LANG)
    except Exception as e:
        log.warning("Could not set MMS adapter for %s: %s", TARGET_LANG, e)

    model.eval()
    return processor, model


def warmup():
    """Trigger model load at startup. Safe to fail if offline/uninstalled."""
    try:
        _load_model()
        log.warning("ASR model warmup completed.")
    except Exception as e:
        log.warning("ASR model warmup skipped or failed: %s", e)


def _decode_audio(file_bytes: bytes) -> np.ndarray:
    """Convert audio bytes into a 16kHz mono float32 array."""
    if not file_bytes:
        raise ValueError("Audio data is empty.")

    # If it is a WAV file:
    if file_bytes.startswith(_WAV_HEADER):
        try:
            sample_rate, audio_data = wav.read(io.BytesIO(file_bytes))
            # Convert multi-channel to mono
            if len(audio_data.shape) > 1:
                audio_data = audio_data.mean(axis=1)

            # Resample or convert to float32 between -1.0 and 1.0
            if audio_data.dtype == np.int16:
                audio_float = audio_data.astype(np.float32) / 32768.0
            elif audio_data.dtype == np.int32:
                audio_float = audio_data.astype(np.float32) / 2147483648.0
            elif audio_data.dtype == np.uint8:
                audio_float = (audio_data.astype(np.float32) - 128) / 128.0
            else:
                audio_float = audio_data.astype(np.float32)

            # Simple resample to 16000 if needed
            if sample_rate != 16000 and len(audio_float) > 0:
                num_samples = int(len(audio_float) * 16000 / sample_rate)
                audio_float = np.interp(
                    np.linspace(0, len(audio_float), num_samples, endpoint=False),
                    np.arange(len(audio_float)),
                    audio_float,
                ).astype(np.float32)

            return audio_float
        except Exception as e:
            log.warning("WAV decode failed: %s", e)

    # Try soundfile fallback if available
    try:
        import soundfile as sf

        data, samplerate = sf.read(io.BytesIO(file_bytes))
        if len(data.shape) > 1:
            data = data.mean(axis=1)
        if samplerate != 16000 and len(data) > 0:
            num_samples = int(len(data) * 16000 / samplerate)
            data = np.interp(
                np.linspace(0, len(data), num_samples, endpoint=False),
                np.arange(len(data)),
                data,
            )
        return data.astype(np.float32)
    except Exception as e:
        log.warning("Soundfile fallback failed: %s", e)

    raise ValueError(
        "Could not decode audio. Please ensure the recording is formatted as standard WAV."
    )


def transcribe(audio_bytes: bytes) -> str:
    """Transcribe Hindi speech to Devanagari text."""
    audio_array = _decode_audio(audio_bytes)
    if len(audio_array) == 0:
        raise ValueError("Audio contains no samples.")

    import torch

    processor, model = _load_model()
    inputs = processor(audio_array, sampling_rate=16000, return_tensors="pt")

    with torch.no_grad():
        logits = model(inputs.input_values).logits

    predicted_ids = torch.argmax(logits, dim=-1)
    transcription = processor.batch_decode(predicted_ids)[0]
    return transcription.strip()
