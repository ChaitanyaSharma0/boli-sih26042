# boli-sih26042

# BOLI — Mother-tongue speech for Jharkhand's classrooms
SIH26042 · Government of Jharkhand · Smart Education · Team LARPERS

Turns a Hindi primary-school lesson into a spoken lesson in a child's
mother tongue — for languages no commercial system supports.

## What runs today
| Language | ISO | TTS | Status |
|---|---|---|---|
| Ho | hoc | facebook/mms-tts-hoc | audio generated |
| Mundari | unr | facebook/mms-tts-unr | audio generated |
| Kurukh | kru | facebook/mms-tts-kru | audio generated |
| Sadri | sck | facebook/mms-tts-sck | audio generated |
| Santali | sat | none exists | translation only |

## Findings (4 Sep 2026)
- Google Translate: Santali text only, "Listen" disabled. Ho, Mundari,
  Kurukh, Sadri absent entirely.
- No MMS-TTS checkpoint exists for Santali.
- MMS trained Ho/Mundari TTS on **Odia script**; Jharkhand writes them
  in Devanagari / Warang Chiti — transliteration layer required.
- IndicTrans2 leaks Meetei Mayek script on out-of-domain vocabulary
  (गेहूँ, धान). Shorter, culturally localised sentences return clean Ol Chiki.

## Live URLs

*(Not deployed yet. Everything is prepared — `backend/Dockerfile`, the
Space card in `backend/README.md`, and both verification scripts take a
`--base-url`. The deploy needs a write-scoped HF token and Vercel
access; see `docs/DEPLOY.md`.)*

| | URL |
|---|---|
| Backend (HF Space, Docker SDK) | *pending* |
| Frontend (Vercel) | *pending* |

## Running it locally

```bash
# backend — from backend/, with .env filled in from .env.example
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
./.venv/Scripts/python.exe -m pip install --no-build-isolation --no-deps   git+https://github.com/VarunGumma/IndicTransToolkit.git@0c607654e8
./.venv/Scripts/python.exe -m uvicorn main:app --port 8000

# frontend — from frontend/
npm install && npm run dev
```

First backend start downloads ~1.7GB of model weights and warms all five
models before serving.

## Checks

```bash
cd backend  && ./.venv/Scripts/python.exe test_contrast.py      # the P0 contrast
cd backend  && ./.venv/Scripts/python.exe test_phrase_bank.py   # the scope boundary
cd backend  && ./.venv/Scripts/python.exe test_corrections.py   # lessons + corrections
cd backend  && ./.venv/Scripts/python.exe test_ocr_pedagogy.py  # ocr + LLM + retries
cd frontend && npm test                                         # capability copy and rules
```

`test_contrast.py` also takes `--base-url` to run against a deployed
instance. `frontend/test/degradation.mjs` takes a URL too — see
`docs/DEPLOY.md`.

## Notebook
`research/sih_2026.ipynb` — coverage probe, TTS generation, IndicTrans2 test.
