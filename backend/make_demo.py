"""Record the offline demo: one real run of the pipeline, saved as files.

    ./.venv/Scripts/python.exe make_demo.py

Runs the same calls, in the same order, the Result screen makes — with
the real models and the real simplifier — and writes the responses to
frontend/public/demo/ (lesson.json plus one wav per spoken language).
The app's "Offline demo" replays exactly these files with no backend, so
a demo cannot die on venue Wi-Fi, an LLM outage or a cold model load.
Nothing is edited by hand: re-run this script to refresh it.
"""

import base64
import io
import json
import sys
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

LESSON = "पानी हमारा जीवन है।"  # in the phrase bank, so every voice has something to say
GRADE = 2
OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "demo"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with TestClient(app) as client:  # context manager: runs the model warmup
        languages = client.get("/languages").json()

        audio = {}
        for lang in (l for l in languages if l["tts"] == "full"):
            r = client.post("/speak", json={"text": LESSON, "lang": lang["code"]})
            if r.headers["content-type"] != "audio/wav":
                print(f"{lang['code']}: refused — {r.json().get('reason')}")
                continue
            (OUT / f"{lang['code']}.wav").write_bytes(r.content)
            spoken = r.headers.get("X-Target-Text")
            audio[lang["code"]] = {
                "kind": "audio",
                "file": f"{lang['code']}.wav",
                "text": base64.b64decode(spoken).decode("utf-8") if spoken else LESSON,
                "textIsTarget": bool(spoken),
            }
            print(f"{lang['code']}: {len(r.content)} bytes, spoke {audio[lang['code']]['text']}")

        adapted = client.post("/simplify", json={"text": LESSON, "grade": GRADE})
        if adapted.status_code != 200:
            sys.exit(f"/simplify failed ({adapted.status_code}): {adapted.text} — fix the LLM config and re-run")
        adapted = adapted.json()
        print("simplified:", adapted["adapted_hindi"])

        translations = []
        for lang in (l for l in languages if l["translation"] == "full"):
            for sentence in adapted["adapted_hindi"]:
                t = client.post("/translate", json={"text": sentence, "target": "sat_Olck"})
                if t.status_code != 200:
                    sys.exit(f"/translate failed ({t.status_code}): {t.text}")
                t = t.json()
                translations.append({
                    "code": lang["code"],
                    "name": lang["name"],
                    "sentence": sentence,
                    "translated": t["translated"],
                    "contaminated": t["script_contamination"],
                })
                print(f"{lang['code']}: {sentence} -> {t['translated']}")

    lesson = {
        "recorded": date.today().isoformat(),
        "hindiText": LESSON,
        "grade": GRADE,
        "languages": languages,
        "adapted": adapted,
        "translations": translations,
        "audio": audio,
    }
    (OUT / "lesson.json").write_text(json.dumps(lesson, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nwrote {OUT / 'lesson.json'} and {len(audio)} wav files")


if __name__ == "__main__":
    main()
