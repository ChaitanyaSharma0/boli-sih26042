"""Degenerate-output check for IndicTrans2 — runs without loading a model.

    ./.venv/Scripts/python.exe test_translation_guard.py

The loop below is the real output IndicTrans2 gave for "नमस्ते" (302
characters of one repeated syllable). The clean lines are real outputs
that must keep passing through untouched, including the pinned गेहूँ
contrast whose Meetei Mayek is a different, separately reported failure.
"""

import io
import sys

from models.translation import is_degenerate

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

LOOP = "ᱦᱚ" + "ᱞᱮᱹ" * 60 + "ᱞᱮ"
CLEAN = {
    "नमस्ते": "ᱦᱚᱞᱮᱹᱢᱮ ᱾",
    "जोहार": "ᱡᱩᱭᱟᱹᱧ ᱾",
    "यहाँ बैठो": "ᱱᱚᱶᱟ ᱨᱮ ᱥᱮᱱ ᱢᱮ ᱾",
    "पानी हमारा जीवन है।": "ᱫᱟᱜ ᱫᱚ ᱦᱩᱭᱩᱜ ᱠᱟᱱᱟ ᱤᱧᱟᱹᱜ ᱡᱤᱭᱚᱱ ᱾",
    "किसान खेत में गेहूँ उगाता है।": "ᱪᱟᱥᱤᱭᱟᱹ ᱠᱚ ᱪᱟᱥ ᱚᱲᱟᱜ ᱨᱮ ꯒꯦꯍꯨ ᱠᱚ ᱡᱟᱱᱟᱢᱼᱟ ᱾",
}


def test_the_real_loop_is_caught():
    assert is_degenerate(LOOP, "नमस्ते"), "the नमस्ते loop must never reach a teacher"
    # The comma-separated form seen in the UI earlier.
    assert is_degenerate(",".join(["ᱵᱮᱲ"] * 30), "नमस्ते")


def test_real_translations_pass():
    for source, output in CLEAN.items():
        assert not is_degenerate(output, source), (source, output)


def test_a_loop_inside_a_long_sentence_is_caught_by_pattern_alone():
    # Too short to trip the length rule, so only the repetition pattern can
    # catch it. This failed while the pattern's \1 had been mangled into a
    # control character — the length rule had been hiding that.
    source = "बच्चे सुबह स्कूल जाते हैं और शाम को खेत में माता-पिता की मदद करते हैं।"
    output = "ᱜᱤᱫᱨᱤ ᱠᱚ ᱥᱮᱛᱟᱜ ᱨᱮ ᱤᱥᱠᱩᱞ " + "ᱞᱮᱹ" * 6 + " ᱾"
    assert len(output.replace(" ", "")) < 4 * len(source.replace(" ", "")) + 40
    assert is_degenerate(output, source)


def test_runaway_length_is_caught_without_a_pattern():
    varied = " ".join(f"ᱥᱟᱱ{chr(0x1C5A + i % 20)}" for i in range(40))
    assert is_degenerate(varied, "नमस्ते")


if __name__ == "__main__":
    test_the_real_loop_is_caught()
    test_a_loop_inside_a_long_sentence_is_caught_by_pattern_alone()
    test_real_translations_pass()
    test_runaway_length_is_caught_without_a_pattern()
    print("PASS")
