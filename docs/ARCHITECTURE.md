# ARCHITECTURE — BOLI

Companion to PRD.md. Read that first for scope boundaries — this file
is *how*, not *what/why*.

## 1. High-level shape

```
[Browser: React frontend]
        |  HTTPS / JSON
        v
[FastAPI backend]
   |        |         |          |
   v        v         v          v
[OCR]  [Pedagogy]  [Translate]  [TTS]
(Tesseract) (LLM API) (IndicTrans2) (MMS-TTS)
        |
        v
[SQLite: lessons, corrections]
```

Everything runs server-side behind the FastAPI app. The frontend never
calls a model directly — it only talks to our backend. This matters
because the gated HF models (IndicTrans2) need a token that must never
reach the browser.

## 2. Repo layout

```
boli/
├── backend/
│   ├── main.py                 # FastAPI app, route registration
│   ├── routes/
│   │   ├── ocr.py              # POST /ocr
│   │   ├── pedagogy.py         # POST /simplify
│   │   ├── translate.py        # POST /translate
│   │   ├── speak.py            # POST /speak
│   │   ├── correct.py          # POST /correct, GET /corrections
│   │   └── languages.py        # GET /languages
│   ├── models/
│   │   ├── tts.py              # MMS-TTS wrapper, model cache dict
│   │   ├── translation.py      # IndicTrans2 wrapper
│   │   └── pedagogy.py         # LLM call wrapper
│   ├── db/
│   │   ├── schema.sql
│   │   └── db.py                # sqlite connection helpers
│   ├── static/audio/            # generated wav files, served statically
│   ├── requirements.txt
│   └── .env.example             # HF_TOKEN, LLM_API_KEY placeholders
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── screens/
│   │   │   ├── Capture.jsx       # screen 1
│   │   │   ├── LanguageSelect.jsx# screen 2
│   │   │   └── Result.jsx        # screen 3
│   │   ├── components/
│   │   │   ├── AudioPlayer.jsx
│   │   │   ├── LanguageChip.jsx
│   │   │   └── CorrectionForm.jsx
│   │   └── api.js                # fetch wrappers to backend
│   ├── package.json
│   └── vite.config.js
├── docs/                          # this planning set
└── README.md
```

## 3. Backend endpoints — contract

All requests/responses JSON unless noted.

### `POST /ocr`
Request: multipart image file.
Response: `{ "text": "किसान खेत में गेहूँ उगाता है..." }`
Implementation: Tesseract, Hindi (`hin`) language pack. If OCR confidence
is low, return the raw text anyway with `"confidence": "low"` — never
block the flow, the teacher can hand-edit the text on screen 1.

### `POST /simplify`
Request: `{ "text": "<hindi sentence>" }`
Response:
```json
{
  "concept": "...",
  "adapted_hindi": ["...", "...", "..."],
  "substitutions": [{"from": "...", "to": "...", "why": "..."}],
  "readability": {"before_wps": 10, "after_wps": 4.3}
}
```
Implementation: single LLM call, prompt lives in `models/pedagogy.py`,
NOT inline in the route file — keep prompts in one place, versioned.

### `POST /translate`
Request: `{ "text": "<hindi sentence>", "target": "sat_Olck" }`
Response: `{ "translated": "<ol chiki text>", "target": "sat_Olck" }`
**`target` accepts only `sat_Olck` in this build.** Any other value
returns `501 Not Implemented` with a message pointing at the phrase
bank endpoint instead. Do not silently fall through — fail loudly and
explain why, per PRD.md scope boundary.

### `POST /speak`
Request: `{ "text": "<text in target script>", "lang": "hoc" }`
Response: audio/wav binary, OR `{ "phrase_bank_only": true, "options": [...] }`
if `lang` is one of `hoc/unr/kru/sck` and the submitted text doesn't
match a known phrase-bank entry (see DATA_DICTIONARY.md for the phrase
bank table). This is the enforcement point for the scope boundary —
this route is where "no fake translation" actually gets guaranteed in
code, not just in docs.

### `GET /languages`
Response:
```json
[
  {"code": "sat", "name": "Santali", "translation": "full", "tts": "none", "note": "no TTS checkpoint exists anywhere"},
  {"code": "hoc", "name": "Ho", "translation": "phrase_bank", "tts": "full"},
  {"code": "unr", "name": "Mundari", "translation": "phrase_bank", "tts": "full"},
  {"code": "kru", "name": "Kurukh", "translation": "phrase_bank", "tts": "full"},
  {"code": "sck", "name": "Sadri", "translation": "phrase_bank", "tts": "full"}
]
```
Frontend renders capability honestly from this response — never
hardcode language capabilities in the frontend.

### `POST /correct`
Request: `{ "lesson_id": 1, "original": "...", "corrected": "...", "lang": "hoc" }`
Response: `{ "id": 42, "logged": true }`
Just writes a row. No retraining triggered. See DATA_DICTIONARY.md.

### `GET /corrections/count`
Response: `{ "count": 37 }` — powers the "N corrections collected"
counter on the frontend. Honest, small, real.

## 4. Model loading strategy

Load every model **once at startup**, keep in a module-level dict, never
reload per-request — this is the difference between a 15-second demo
and a 3-second one. See `models/tts.py` for the caching pattern already
proven in the Colab notebook (`/docs/research/` has the working code).

## 5. Frontend data flow

Screen 1 (Capture) → holds `hindiText` in state → screen 2 (LanguageSelect)
→ holds `selectedLangs[]` → screen 3 (Result) fires, in order:
`POST /simplify` → `POST /translate` (if Santali selected) →
`POST /speak` per selected language → render all results together.

Do not fire these in parallel on first pass — sequential is simpler to
debug and fast enough for a hackathon demo. Parallelize only if latency
is visibly bad in testing.

## 6. Deployment target

- Backend: Render or a persistent HF Space (Docker SDK, not Gradio SDK)
- Frontend: Vercel or Netlify, static build
- Both must be **permanent URLs**, not Colab tunnels — this is a hard
  requirement, see PRD.md success criteria.

## 7. What this architecture deliberately does not include

No auth, no user accounts, no multi-tenant anything, no queueing system,
no message broker. This is a single-teacher-facing demo backend. Adding
any of that is scope creep for this build — see PRD.md non-goals.