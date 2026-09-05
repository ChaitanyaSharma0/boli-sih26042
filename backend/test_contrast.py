"""Phase 1 verification — run with the venv python from backend/.

    ./.venv/Scripts/python.exe test_contrast.py

Two things are checked, both through the real FastAPI routes:

1. The Santali script-contamination contrast (PRD.md §5, PLAN.md Phase 1
   and 8). This is the single most important behaviour in the app —
   re-run this after ANY change to the translation route or wrapper
   (RULES.md §4).
2. /speak returns real wav bytes for Ho.

The contrast is driven by out-of-domain *vocabulary*, not sentence
length: गेहूँ and धान both fall outside IndicTrans2's Santali training
distribution and both leak Meetei Mayek. See the note in the assertions.
"""

import io
import sys

from dotenv import load_dotenv

load_dotenv()

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402
from models.translation import contains_meetei_mayek  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

TEXTBOOK = "किसान खेत में गेहूँ उगाता है और उसे बाज़ार में बेचता है।"
ADAPTED_CLEAN = "धान हाट में बिकता है।"


def main():
    with TestClient(app) as client:
        r = client.post("/translate", json={"text": TEXTBOOK, "target": "sat_Olck"})
        r.raise_for_status()
        textbook = r.json()
        textbook_out = textbook["translated"]
        print("textbook :", TEXTBOOK, "\n        ->", textbook_out)

        r = client.post("/translate", json={"text": ADAPTED_CLEAN, "target": "sat_Olck"})
        r.raise_for_status()
        adapted = r.json()
        adapted_out = adapted["translated"]
        print("adapted  :", ADAPTED_CLEAN, "\n        ->", adapted_out)

        assert contains_meetei_mayek(textbook_out), (
            "The long textbook sentence no longer leaks Meetei Mayek. Either the "
            "checkpoint changed or the port is wrong — this contrast is a PRD.md "
            "§5 success criterion, so fix it, do not relax this assertion."
        )
        assert not contains_meetei_mayek(adapted_out), (
            "The adapted sentence now leaks Meetei Mayek — the clean half of the "
            "contrast is gone. Same rule: fix it, do not relax the assertion."
        )

        # The route must report the contamination, not merely contain it.
        # A caller that cannot tell these two responses apart will render
        # broken output as if it were fine (ARCHITECTURE.md §3).
        assert textbook["script_contamination"] is True, textbook
        assert adapted["script_contamination"] is False, adapted
        print("flagged  : textbook script_contamination=True, adapted=False")

        # Ho: real speech, real bytes. Odia script, per DATA_DICTIONARY.md §1.
        r = client.post("/speak", json={"text": "ଦା ଆଲେ ଜୀଉ ତାନା", "lang": "hoc"})
        r.raise_for_status()
        wav = r.content
        assert wav[:4] == b"RIFF", f"not a wav file: {wav[:16]!r}"
        assert len(wav) > 20_000, f"suspiciously short audio: {len(wav)} bytes"
        print(f"ho wav   : {len(wav)} bytes, RIFF header ok")

        # The honesty boundary, enforced in code (PRD.md §4, RULES.md §2).
        r = client.post("/translate", json={"text": "पानी", "target": "hoc_Deva"})
        assert r.status_code == 501, r.status_code
        r = client.post("/speak", json={"text": "ᱫᱟᱜ", "lang": "sat"})
        assert r.status_code == 501, r.status_code
        print("boundary : /translate non-Santali 501, /speak Santali 501")

    print("\nPASS")


if __name__ == "__main__":
    main()
