# DATA_DICTIONARY — BOLI

Companion to ARCHITECTURE.md. Exact schema and exact model identifiers —
if code and this file disagree, this file is wrong and should be fixed,
not silently diverged from.

## 1. Model IDs — copy these exactly, do not guess at variants

| Purpose | Model ID | Notes |
|---|---|---|
| Translation (Santali only) | `ai4bharat/indictrans2-indic-indic-dist-320M` | Gated. Needs `HF_TOKEN`. Target lang code: `sat_Olck`. Source: `hin_Deva`. |
| TTS — Ho | `facebook/mms-tts-hoc` | Expects **Odia script** input, not Devanagari. |
| TTS — Mundari | `facebook/mms-tts-unr` | Expects **Odia script** input. |
| TTS — Kurukh | `facebook/mms-tts-kru` | Expects Devanagari input. |
| TTS — Sadri | `facebook/mms-tts-sck` | Expects Devanagari input. |
| TTS — Santali | *(none exists)* | No checkpoint anywhere, from anyone. Do not search for one and swap it in without updating PRD.md and this table. |
| Pedagogy simplification | LLM API, provider chosen by `LLM_PROVIDER`: `gemini` (Google REST) or `openai_compatible` (any OpenAI-shaped `/chat/completions`, via `LLM_BASE_URL` + `LLM_MODEL`) | Prompt lives in `backend/models/pedagogy.py` |
| OCR | Tesseract, `hin` language pack | Local, no API key needed |

## 2. Phrase bank — the fixed Hindi → target-language pairs

This table is the entire content of the "curated phrase bank" referred
to in PRD.md §4 and ARCHITECTURE.md §3. **Every entry was checked by
native speakers on 2026-09-18**: Native-speaker college students from Jharkhand (2–3 people); names withheld at their request.
All 20 entries, each checked individually; no corrections needed (`VERIFICATION` in phrase_bank.py holds the
record). Checked means the Hindi phrase and the target string match; it
does not make BOLI a translator — text outside this table is still
refused by /speak. Ho and Mundari target strings are in Odia script, as
their TTS checkpoints expect (models/tts.py SCRIPTS).

| id | lang_code | hindi_source | target_text | verified |
|---|---|---|---|---|
| 1 | hoc | पानी हमारा जीवन है | ଦା ଆଲେ ଜୀଉ ତାନା | true |
| 2 | unr | पानी हमारा जीवन है | ଦା ଆଲେ ଜିଉ ତାନା | true |
| 3 | kru | पानी हमारा जीवन है | अम्म हमक जीवन रअदा | true |
| 4 | sck | पानी हमारा जीवन है | पानी हमन के जीवन हे | true |
| 5 | hoc | नमस्ते | ଜୋହାର | true |
| 6 | unr | नमस्ते | ଜୋହାର | true |
| 7 | kru | नमस्ते | जोहार | true |
| 8 | sck | नमस्ते | जोहार | true |
| 9 | hoc | किताब खोलो | ପୁଥି ଉଗାଡ଼ା | true |
| 10 | unr | किताब खोलो | ପୁଥି ଉଗାଡ଼ା | true |
| 11 | kru | किताब खोलो | किताब उग्गड़ा | true |
| 12 | sck | किताब खोलो | किताब खोला | true |
| 13 | hoc | यहाँ बैठो | ନେରେ ଦୁବୁ ମେ | true |
| 14 | unr | यहाँ बैठो | ନେରେ ଦୁବୁ ମେ | true |
| 15 | kru | यहाँ बैठो | इस्सने उक्का | true |
| 16 | sck | यहाँ बैठो | इहाँ बैठा | true |
| 17 | hoc | स्कूल चलो | ଇସ୍କୁଲ ସେନୋଃ ମେ | true |
| 18 | unr | स्कूल चलो | ଇସ୍କୁଲ ସେନୋଃ ମେ | true |
| 19 | kru | स्कूल चलो | स्कूल कला | true |
| 20 | sck | स्कूल चलो | स्कूल चला | true |

**`backend/models/phrase_bank.py` is the single source of truth, full
stop.** The table above documents what is in that module; it is not a
substitute for reading the code, and there is no database copy. The
phrase bank is deliberately NOT stored in SQLite — see §3.

**Expanding the phrase bank**: adding new phrases is allowed and
encouraged (more classroom topics = better demo), but every new entry
must follow the same rule — Hindi source, hand-constructed or
speaker-provided target text, `verified: false` until an actual speaker
confirms it (the UI then says "pending validation" for that language), and it must stay inside the target model's known-working
character set. See RULES.md §8 for how to check a checkpoint's vocab
before writing text for it.

## 3. Database schema

```sql
-- lessons: one row per teacher submission (capture -> result flow)
CREATE TABLE lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    source_text TEXT NOT NULL,           -- original Hindi: typed, OCR'd, from a PDF chapter or dictated
    source_type TEXT NOT NULL,           -- 'typed' | 'ocr' | 'pdf_chapter' | 'asr'
    adapted_text TEXT,                   -- pedagogy output, JSON-encoded array
    santali_translation TEXT,            -- Ol Chiki, null if not requested
    languages_requested TEXT NOT NULL    -- JSON array, e.g. ["hoc","sat"]
);

-- corrections: teacher-submitted fixes, logged not auto-applied
CREATE TABLE corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER REFERENCES lessons(id),
    lang_code TEXT NOT NULL,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**There is no `phrase_bank` table, on purpose.** The curated entries
live only in `backend/models/phrase_bank.py` (§2). Putting them in the
database would mean flipping an entry's `verified` flag could happen
through a runtime `UPDATE`; keeping them in version-controlled code
means it takes a reviewed commit. That flag is exactly the claim
RULES.md §2 says must never be softened quietly, so it does not get a
path that bypasses review. Decided 2026-09-05.

## 4. API response shapes (canonical — matches ARCHITECTURE.md §3)

These are the source-of-truth JSON shapes. If a route's actual response
drifts from this, that's a bug in the route, not a reason to update
this file casually.

```jsonc
// GET /languages
[
  {
    "code": "sat",
    "name": "Santali",
    "translation": "full",       // "full" | "phrase_bank" | "none"
    "tts": "none",                // "full" | "phrase_bank" | "none"
    "note": "No TTS checkpoint exists anywhere for Santali."
  },
  {
    "code": "hoc",
    "name": "Ho",
    "translation": "phrase_bank",
    "tts": "full",
    "note": null
  }
  // ...unr, kru, sck follow the same shape as hoc
]
```

```jsonc
// POST /translate response
{
  "translated": "ᱪᱟᱥᱤᱭᱟᱹ ᱫᱚ ᱪᱟᱥ ᱚᱲᱟᱜ ᱨᱮ ꯒꯦꯍꯨ ᱡᱟᱱᱟᱢᱼᱟ ᱾",
  "target": "sat_Olck",
  "script_contamination": true   // Meetei Mayek present in the output
}
```

`script_contamination` is computed by `contains_meetei_mayek()` in
`backend/models/translation.py`. True means IndicTrans2 fell back to
another Indic script mid-sentence because a word was outside its Santali
training data — `ꯒꯦꯍꯨ` for गेहूँ, `ꯆꯦꯡ` for धान. The frontend must show
something visible when this is true; see ARCHITECTURE.md §3.

It is a measurement of one known failure, not a general check that the
output is correct. `false` means no Meetei Mayek was found, and nothing
more than that — it is not a claim that the translation is right.

```jsonc
// POST /lessons response
{ "id": 1 }
```

```jsonc
// POST /simplify response
{
  "concept": "Farmers grow food and sell it to others.",
  "adapted_hindi": [
    "किसान खेत में धान उगाता है।",
    "धान हाट में बिकता है।",
    "किसान पैसे कमाता है।"
  ],
  "substitutions": [
    {"from": "गेहूँ", "to": "धान", "why": "Wheat is not grown in Jharkhand."},
    {"from": "बाज़ार", "to": "हाट", "why": "Haat is the local weekly market."}
  ],
  "readability": {"before_wps": 10, "after_wps": 4.3}
}
```

## 5. Environment variables (`.env`)

```
HF_TOKEN=            # required for IndicTrans2 gated model
LLM_API_KEY=         # for pedagogy simplification step
LLM_PROVIDER=        # "gemini" | "openai_compatible"
LLM_BASE_URL=        # openai_compatible only, e.g. https://host/v1
LLM_MODEL=           # openai_compatible only, the model slug
DATABASE_PATH=./db/boli.sqlite
TESSERACT_CMD=       # optional, if tesseract is not on PATH
```

Never commit a real `.env`. `.env.example` in the repo has these keys
with empty values, per ARCHITECTURE.md §2.