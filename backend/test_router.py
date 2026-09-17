"""Automated evaluation test suite for BOLI multilingual translation router.

Tests 24 arbitrary unseen sentences across:
- Santali (sat_Olck)
- Kurukh (kru_Deva)
- Mundari (unr_Deva)
- Sadri (sck_Deva)
- Ho (hoc_Deva)
- English pivot translation
- Multi-paragraph newline preservation
"""

import time
from dotenv import load_dotenv
load_dotenv()

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

TEST_CASES = [
    # General classroom & nature
    ("मैं आज स्कूल जा रहा हूँ।", "sat_Olck"),
    ("मैं आज स्कूल जा रहा हूँ।", "kru_Deva"),
    ("मैं आज स्कूल जा रहा हूँ।", "unr_Deva"),
    ("मैं आज स्कूल जा रहा हूँ।", "sck_Deva"),
    ("मैं आज स्कूल जा रहा हूँ।", "hoc_Deva"),

    # Core environmental / science concept
    ("पानी हमारा जीवन है।", "sat_Olck"),
    ("पानी हमारा जीवन है।", "kru_Deva"),
    ("पानी हमारा जीवन है।", "unr_Deva"),
    ("पानी हमारा जीवन है।", "sck_Deva"),
    ("पानी हमारा जीवन है।", "hoc_Deva"),

    # Agriculture & village economy
    ("किसान खेत में धान उगाता है।", "sat_Olck"),
    ("किसान खेत में धान उगाता है।", "kru_Deva"),
    ("किसान खेत में धान उगाता है।", "unr_Deva"),
    ("किसान खेत में धान उगाता है।", "sck_Deva"),
    ("किसान खेत में धान उगाता है।", "hoc_Deva"),

    # Interrogatives / Questions
    ("तुम्हारा नाम क्या है?", "kru_Deva"),
    ("तुम्हारा नाम क्या है?", "sck_Deva"),
    ("तुम्हारा नाम क्या है?", "hoc_Deva"),

    # Multi-sentence classroom instruction
    ("किताब खोलो। पाठ ध्यान से पढ़ो।", "kru_Deva"),
    ("किताब खोलो। पाठ ध्यान से पढ़ो।", "sck_Deva"),
    ("किताब खोलो। पाठ ध्यान से पढ़ो।", "hoc_Deva"),

    # English pivot
    ("Water is our life.", "sat_Olck"),
    ("Water is our life.", "kru_Deva"),
    ("Water is our life.", "sck_Deva"),
    ("Water is our life.", "hoc_Deva"),
]

MULTI_PARAGRAPH = """पेड़ हमें फल और छाया देते हैं। वे पर्यावरण को शुद्ध रखते हैं।

हमें अधिक से अधिक पेड़ लगाने चाहिए। जंगल हमारा रक्षक है।"""


def test_translation_endpoints():
    print("\n=======================================================")
    print("   BOLI MULTILINGUAL TRANSLATION EVALUATION SUITE")
    print("=======================================================\n")
    
    passed = 0
    total = len(TEST_CASES) + 1  # plus multi-paragraph test

    for idx, (sentence, target) in enumerate(TEST_CASES, 1):
        t0 = time.time()
        r = client.post("/translate", json={"text": sentence, "target": target})
        dur = (time.time() - t0) * 1000

        assert r.status_code == 200, f"Failed {sentence} -> {target}: {r.status_code} {r.text}"
        data = r.json()

        assert data.get("translation") or data.get("translated"), f"Empty translation for {target}"
        trans = data.get("translation") or data.get("translated")
        mode = data.get("mode")

        print(f"[{idx:2d}/{total}] {target:10} ({mode:14}) [{dur:6.1f}ms]")
        print(f"     IN : {sentence}")
        print(f"     OUT: {trans}\n")
        passed += 1

    # Test Multi-paragraph
    print(f"[{total}/{total}] MULTI-PARAGRAPH PRESERVATION TEST:")
    t0 = time.time()
    r = client.post("/translate", json={"text": MULTI_PARAGRAPH, "target": "sck_Deva"})
    dur = (time.time() - t0) * 1000
    assert r.status_code == 200
    data = r.json()
    trans = data.get("translation")
    assert "\n" in trans, "Paragraph newline not preserved"
    print(f"     OUT:\n{trans}\n")
    passed += 1

    print("=======================================================")
    print(f"   ALL {passed}/{total} EVALUATION TESTS PASSED SUCCESSFULLY!")
    print("=======================================================\n")


if __name__ == "__main__":
    test_translation_endpoints()
