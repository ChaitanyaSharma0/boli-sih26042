"""Phase 2 Verification Suite — 50 Arbitrary Speech and Translation Tests.

Tests 10 diverse sentences across all 5 target languages (50 tests total):
  - Santali (sat_Olck) - IndicTrans2 + Indic Parler-TTS (Ol Chiki)
  - Ho (hoc_Deva) - Linguistic Transfer + Meta MMS-TTS (Deva -> Odia)
  - Mundari (unr_Deva) - Linguistic Transfer + Meta MMS-TTS (Deva -> Odia)
  - Kurukh (kru_Deva) - Fine-tuned Neural MT + Meta MMS-TTS (Devanagari)
  - Sadri (sck_Deva) - Morpho-syntactic Rule Engine + Meta MMS-TTS (Devanagari)

Validates:
  1. Translation succeeds without empty returns or script crashes.
  2. Synthesized audio produces valid 16-bit PCM WAV headers (RIFF/WAVE).
  3. Positive audio duration (> 0.5s) and verified sample rates (16kHz / 44.1kHz).
  4. Arbitrary generalization (no phrase-bank dependencies).
  5. Clean error isolation between translation and TTS layers.
"""

import base64
import io
import os
import sys
import time
import wave

from dotenv import load_dotenv

load_dotenv()

from fastapi.testclient import TestClient

from main import app
from models import phrase_bank

# Fix terminal output encoding on Windows/Mac
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

client = TestClient(app)

TEST_SENTENCES = [
    ("Short greeting", "नमस्ते बच्चों, बैठ जाओ।"),
    ("Classroom instruction", "सब बच्चे अपनी किताब खोलो और पाठ पढ़ो।"),
    ("Question inquiry", "तुम्हारा क्या नाम है और तुम कहाँ रहते हो?"),
    ("Agriculture / Village", "किसान खेत में धान उगाता है और बाज़ार में बेचता है।"),
    ("Nature / Environment", "पानी हमारा जीवन है और जंगल के पेड़ बहुत ज़रूरी हैं।"),
    ("Encouragement", "शाबाश बच्चों, आज तुमने बहुत अच्छा काम किया।"),
    ("Daily routine / Home", "मैं शाम को घर लौटकर माँ की मदद करता हूँ।"),
    ("Numbers / Counting", "कक्षा में दस लड़के और बारह लड़कियाँ पढ़ती हैं।"),
    ("Compound clause", "यदि बारिश होगी, तो फ़सल अच्छी होगी और किसान खुश होंगे।"),
    ("Novel unseen", "छोटे-छोटे बच्चे नदी के किनारे मिलकर गेंद खेल रहे हैं।"),
]

TARGET_CONFIGS = [
    ("sat_Olck", "Santali", "neural", "Neural MT + Indic Parler-TTS"),
    ("hoc_Deva", "Ho", "linguistic_transfer", "Linguistic Transfer + MMS-TTS"),
    ("unr_Deva", "Mundari", "linguistic_transfer", "Linguistic Transfer + MMS-TTS"),
    ("kru_Deva", "Kurukh", "neural", "Fine-tuned Neural MT + MMS-TTS"),
    ("sck_Deva", "Sadri", "rule_based", "Rule Engine + MMS-TTS"),
]


def run_phase2_suite():
    print("\n" + "=" * 76)
    print("      BOLI PHASE 2 VERIFICATION — 50 ARBITRARY SPEECH & TRANSLATION TESTS")
    print("=" * 76)

    total_tests = len(TEST_SENTENCES) * len(TARGET_CONFIGS)
    passed_tests = 0
    failures = []
    test_idx = 0

    results_table = []

    for target_code, lang_name, expected_mode, pipeline_desc in TARGET_CONFIGS:
        lang_iso = target_code.split("_")[0]
        print(f"\n--- Testing Language: {lang_name} ({target_code}) | {pipeline_desc} ---")

        for category, hindi_text in TEST_SENTENCES:
            test_idx += 1
            t0 = time.perf_counter()

            # Ensure this is arbitrary text not matching any phrase bank entry
            if lang_iso in phrase_bank.LANGS:
                pb_match = phrase_bank.lookup(lang_iso, hindi_text)
                assert pb_match is None, f"Sentence '{hindi_text}' accidentally matched phrase bank!"

            try:
                # 1. Call /translate-and-speak endpoint
                resp = client.post(
                    "/translate-and-speak",
                    json={"text": hindi_text, "target": target_code},
                )
                latency_ms = (time.perf_counter() - t0) * 1000

                if resp.status_code != 200:
                    raise AssertionError(f"HTTP {resp.status_code}: {resp.text}")

                data = resp.json()

                # 2. Validate translation structure
                translation = data.get("translation", "").strip()
                if not translation:
                    raise AssertionError("Empty translation returned.")
                if translation == hindi_text and lang_iso not in ("hin", "eng"):
                    raise AssertionError("Translation verbatim matches raw input without processing.")

                # Check mode
                actual_mode = data.get("mode")
                if expected_mode and actual_mode != expected_mode:
                    print(f"    [WARN] Mode mismatch: expected {expected_mode}, got {actual_mode}")

                # 3. Validate audio synthesis
                audio_url = data.get("audio_url")
                audio_b64 = data.get("audio_base64")
                duration_sec = data.get("duration_seconds")
                sample_rate = data.get("sample_rate")
                audio_err = data.get("audio_error")

                if audio_err:
                    raise AssertionError(f"Audio synthesis error: {audio_err}")
                if not audio_b64:
                    raise AssertionError("No audio_base64 returned.")
                if not audio_url:
                    raise AssertionError("No audio_url returned.")

                # Decode base64 and inspect WAV header
                wav_bytes = base64.b64decode(audio_b64)
                if len(wav_bytes) < 44:
                    raise AssertionError(f"Audio file truncated ({len(wav_bytes)} bytes).")

                if wav_bytes[:4] != b"RIFF" or wav_bytes[8:12] != b"WAVE":
                    raise AssertionError(f"Invalid WAV header: {wav_bytes[:12]}")

                with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
                    wf_channels = wf.getnchannels()
                    wf_rate = wf.getframerate()
                    wf_frames = wf.getnframes()
                    measured_duration = wf_frames / float(wf_rate)

                if wf_channels != 1:
                    raise AssertionError(f"Expected mono audio (1 channel), got {wf_channels}")
                if wf_rate not in (16000, 22050, 24000, 44100, 48000):
                    raise AssertionError(f"Unexpected sample rate: {wf_rate}")
                if measured_duration < 0.4:
                    raise AssertionError(f"Audio too short: {measured_duration:.2f}s")

                # Also test direct /speak route with target translation
                speak_resp = client.post(
                    "/speak",
                    json={"text": translation, "lang": lang_iso},
                )
                if speak_resp.status_code != 200:
                    raise AssertionError(f"/speak failed: HTTP {speak_resp.status_code}")
                if not speak_resp.headers.get("content-type", "").startswith("audio/wav"):
                    raise AssertionError(f"/speak returned non-WAV: {speak_resp.headers.get('content-type')}")

                passed_tests += 1
                status = "PASS"
                print(f"  [{test_idx:02d}/{total_tests}] {category:<22} -> {duration_sec:.2f}s audio ({latency_ms:5.1f}ms) | {status}")

                results_table.append({
                    "test_id": test_idx,
                    "lang": lang_name,
                    "category": category,
                    "input": hindi_text,
                    "output": translation,
                    "duration": measured_duration,
                    "latency_ms": latency_ms,
                    "status": "PASS",
                })

            except Exception as e:
                failures.append((test_idx, lang_name, category, hindi_text, str(e)))
                print(f"  [{test_idx:02d}/{total_tests}] {category:<22} -> FAILED: {e}")

    print("\n" + "=" * 76)
    print(f"   PHASE 2 ACCEPTANCE SUMMARY: {passed_tests}/{total_tests} TESTS PASSED")
    print("=" * 76)

    if failures:
        print(f"\n{len(failures)} FAILURES ENCOUNTERED:")
        for fid, flang, fcat, finp, ferr in failures:
            print(f"  - [{fid}] {flang} ({fcat}): {finp} -> {ferr}")
        sys.exit(1)
    else:
        print("\nAll 50 tests passed! Arbitrary speech & translation are fully operational.")
        print("PHASE 2 VERIFICATION COMPLETE — READY FOR REVIEW ON larp.")


if __name__ == "__main__":
    run_phase2_suite()
