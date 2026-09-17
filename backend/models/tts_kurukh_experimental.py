"""Experimental Kurukh TTS Engine — IIT Madras 'Kinship in Speech' (arXiv:2506.03884).

This module implements the experimental interface and phonological preprocessing for:
  "Kinship in Speech: Leveraging Linguistic Relatedness for Zero-Shot Speech Synthesis
   in Low-Resource Languages" (Utkarsh Pathak et al., INTERSPEECH 2025 / arXiv:2506.03884).

RESEARCH AUDIT SUMMARY:
=======================
1. Architecture:
   - FastSpeech 2 acoustic model + HiFi-GAN vocoder.
   - Input representation: 72-token Common Label Set (CLS) phoneme sequence.
   - Training: Trained on 10 hours of monolingual studio speech from the IIT Madras
     IndicTTS database (Hindi, Kannada, Marathi, Telugu).
   - Zero-shot Kurukh approach:
     * Sys 1: Hindi FastSpeech 2 model with Indo-Aryan (IA) schwa-deletion parsing rules.
     * Sys 2: Kannada FastSpeech 2 model with Dravidian (DR) schwa-retention rules.
   - Reported evaluation on Kurukh:
     * Sys 1 (Hindi backend): MOS 4.02, SUS WER 7.1%, MCD 8.51
     * Sys 2 (Kannada backend): MOS 2.96, SUS WER 21.0%, MCD 8.28
     * Ground Truth (Bible audio): MOS 4.28

2. Artifact & Weight Availability:
   - GitHub: NO public code repository or checkpoint release exists.
   - Hugging Face: NO model weights or Spaces exist.
   - Supplementary site (https://tts-synth.github.io/): Contains only static evaluation
     HTML, 5 demonstration WAV files, and CLS_mapping.pdf.
   - Reproduction Status: REPRODUCTION BLOCKED BY UNAVAILABLE ARTIFACTS.
     The underlying FastSpeech 2 + HiFi-GAN model weights trained on IndicTTS are
     proprietary internal checkpoints of the IIT Madras Speech Lab (SPRING Lab).

3. Critical Linguistic Finding:
   - The paper's highest-scoring Kurukh system ("Sys 1") is literally a Hindi acoustic
     synthesizer fed with Devanagari text processed through Indo-Aryan schwa-deletion rules.
   - Per BOLI core directives: "Do not use Hindi TTS and call it Kurukh" and
     "Do not fabricate missing checkpoints."
   - Replacing facebook/mms-tts-kru (which was trained on actual Kurukh speech) with an
     unreleased Hindi synthesizer or a makeshift Hindi TTS fallback would directly violate
     linguistic integrity.

This module provides the isolated  interface without
contaminating the production TTS router.
"""

import logging
import os
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# 72-label Common Label Set (CLS) mapping extracted from IIT Madras research
# (https://tts-synth.github.io/CLS_mapping.pdf)
CLS_KURUKH_DEVA_MAP: Dict[str, str] = {
    # Nasalizers & modifiers
    "ँ": "mq",   # chandrabindu
    "ं": "q",    # anusvara
    "ः": "hq",   # visarga
    # Vowels
    "ऄ": "a",    # short a
    "अ": "a",    # a
    "आ": "aa",   # aa
    "इ": "i",    # i
    "ई": "ii",   # ii
    "उ": "u",    # u
    "ऊ": "uu",   # uu
    "ऋ": "rq",   # vocalic r
    "ऌ": "uu",   # vocalic l
    "ऍ": "ae",   # candra e
    "ऎ": "e",    # short e
    "ए": "ee",   # e
    "ऐ": "ei",   # ai
    "ऑ": "ax",   # candra o
    "ऒ": "o",    # short o
    "ओ": "oo",   # o
    "औ": "ou",   # au
    # Consonants
    "क": "k",
    "ख": "kh",
    "ग": "g",
    "घ": "gh",
    "ङ": "ng",
    "च": "c",
    "छ": "ch",
    "ज": "j",
    "झ": "jh",
    "ञ": "nj",
    "ट": "tx",
    "ठ": "txh",
    "ड": "dx",
    "ढ": "dxh",
    "ण": "nx",
    "त": "t",
    "थ": "th",
    "द": "d",
    "ध": "dh",
    "न": "n",
    "ऩ": "n",
    "प": "p",
    "फ": "ph",
    "ब": "b",
    "भ": "bh",
    "म": "m",
    "य": "y",
    "र": "r",
    "ऱ": "r",
    "ल": "l",
    "ळ": "lx",
    "ऴ": "lx",
    "व": "w",
    "श": "sh",
    "ष": "sx",
    "स": "s",
    "ह": "h",
    # Nukta consonants (specifically noted in Section 4.2 for Kurukh)
    "क़": "kq",    # q (qa)
    "ख़": "khq",   # x (kxa / deep aspirated)
    "ग़": "gq",    # gamma (ghra)
    "ज़": "z",     # z (za)
    "ड़": "dxq",   # retroflex flap (rra)
    "ढ़": "dxhq",  # rha
    "फ़": "f",     # fa
    "य़": "y",     # yya
}

# Matras (vowel signs)
CLS_MATRA_MAP: Dict[str, str] = {
    "ा": "aa",
    "ि": "i",
    "ी": "ii",
    "ु": "u",
    "ू": "uu",
    "ृ": "rq",
    "ॄ": "rqw",
    "ॅ": "ae",
    "ॆ": "e",
    "े": "ee",
    "ै": "ei",
    "ॉ": "ax",
    "ॊ": "o",
    "ो": "oo",
    "ौ": "ou",
}


def kurukh_text_to_cls_phones(text: str) -> List[str]:
    """Convert Kurukh Devanagari text into Common Label Set (CLS) phonemes
    with Indo-Aryan (IA) schwa deletion heuristics as described in arXiv:2506.03884.
    """
    phones: List[str] = []
    chars = list(text)
    i = 0
    n = len(chars)

    while i < n:
        c = chars[i]

        # Handle explicit nukta combination: base char + nukta (0x093C)
        if i + 1 < n and chars[i + 1] == "़":
            comb = c + "़"
            if c == "क":
                phones.append("kq")
            elif c == "ख":
                phones.append("khq")
            elif c == "ग":
                phones.append("gq")
            elif c == "ज":
                phones.append("z")
            elif c == "ड":
                phones.append("dxq")
            elif c == "ढ":
                phones.append("dxhq")
            elif c == "फ":
                phones.append("f")
            else:
                phones.append(CLS_KURUKH_DEVA_MAP.get(c, "a"))
            i += 2
            continue

        # Virama (halant 0x094D) suppresses default inherent vowel
        if c == "्":
            i += 1
            continue

        # Matra
        if c in CLS_MATRA_MAP:
            phones.append(CLS_MATRA_MAP[c])
            i += 1
            continue

        # Regular consonant or vowel
        if c in CLS_KURUKH_DEVA_MAP:
            phone = CLS_KURUKH_DEVA_MAP[c]
            phones.append(phone)
            # If consonant, check if inherent schwa 'a' should follow
            is_consonant = "क" <= c <= "ह" or c in "क़ख़ग़ज़ड़ढ़फ़य़"
            if is_consonant:
                # Check next char: if virama or matra, do not add inherent schwa
                if i + 1 < n:
                    next_c = chars[i + 1]
                    if next_c != "्" and next_c not in CLS_MATRA_MAP and next_c != "़":
                        # Word-final schwa deletion heuristic (Indo-Aryan rule)
                        if next_c.isspace() or next_c in "।.,?!":
                            pass  # Deleted at word boundary
                        else:
                            phones.append("a")
                # End of string: word-final schwa deletion
                elif i + 1 == n:
                    pass
        elif c.isspace():
            phones.append("sil")
        elif c in "।.,?!":
            phones.append("pau")

        i += 1

    return phones


def is_iitm_checkpoint_available() -> bool:
    """Check if the IIT Madras FastSpeech 2 / HiFi-GAN acoustic checkpoint
    has been locally supplied via environment configuration.
    """
    ckpt_dir = os.environ.get("IITM_KURUKH_CHECKPOINT_DIR")
    if ckpt_dir and os.path.exists(ckpt_dir):
        return os.path.exists(os.path.join(ckpt_dir, "checkpoint.pth"))
    return False


def synthesize_kurukh_experimental(text: str) -> bytes:
    """Synthesize Kurukh speech using the IIT Madras zero-shot framework
    (arXiv:2506.03884).

    Raises:
        NotImplementedError: If the unreleased IIT Madras FastSpeech 2 / HiFi-GAN
        checkpoints are not locally provided. In accordance with BOLI guidelines,
        we do not fabricate missing checkpoints or proxy Hindi TTS as Kurukh.
    """
    if not is_iitm_checkpoint_available():
        raise NotImplementedError(
            "Reproduction blocked by unavailable artifacts: The IIT Madras FastSpeech 2 / "
            "HiFi-GAN acoustic model checkpoints (Sys 1: Hindi, Sys 2: Kannada) trained on "
            "IndicTTS (arXiv:2506.03884) have not been publicly released by the authors. "
            "No public weights exist on Hugging Face, GitHub, or Bhashini. "
            "In accordance with BOLI safety rules, we do not fabricate missing weights or "
            "substitute generic Hindi TTS for Kurukh."
        )

    raise NotImplementedError("Checkpoint loading not configured.")
