"""Unit tests for new chapter extraction, grade-level simplification, and ASR.

Run: python test_chapter_asr.py
"""

import sys
import unittest
from unittest.mock import MagicMock

# Mock external modules if not installed in local development environment
for mod in [
    "fastapi",
    "fastapi.middleware.cors",
    "fastapi.staticfiles",
    "pytesseract",
    "PIL",
    "requests",
    "openai",
    "scipy",
    "scipy.io.wavfile",
    "numpy",
]:
    if mod not in sys.modules:
        sys.modules[mod] = MagicMock()

from routes.chapter import split_hindi_sentences
from models.pedagogy import GRADE_GUIDANCE, SIMPLIFY_PROMPT


class TestChapterAndVoice(unittest.TestCase):
    def test_hindi_sentence_splitting(self):
        text = "कक्षा दो के बच्चे खेल रहे हैं। गुरुजी पाठ पढ़ाते हैं॥ क्या सब समझ आया? हाँ!"
        sentences = split_hindi_sentences(text)
        self.assertEqual(len(sentences), 4)
        self.assertEqual(sentences[0], "कक्षा दो के बच्चे खेल रहे हैं।")
        self.assertEqual(sentences[1], "गुरुजी पाठ पढ़ाते हैं॥")
        self.assertEqual(sentences[2], "क्या सब समझ आया?")
        self.assertEqual(sentences[3], "हाँ!")

    def test_grade_guidance_all_classes(self):
        for grade in range(1, 6):
            self.assertIn(grade, GRADE_GUIDANCE)
            prompt = SIMPLIFY_PROMPT.format(
                text="किसान खेत में काम करता है।",
                grade_instruction=GRADE_GUIDANCE[grade],
            )
            self.assertIn(f"Class {grade}", prompt)
            self.assertIn("किसान खेत में काम करता है।", prompt)

    def test_empty_sentence_splitting(self):
        self.assertEqual(split_hindi_sentences(""), [])
        self.assertEqual(split_hindi_sentences("   "), [])


if __name__ == "__main__":
    unittest.main()
