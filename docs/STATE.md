# STATE — BOLI

**This file is the first thing to read at the start of any session.**
It exists so a fresh Claude Code session (or a human) can pick up
exactly where the last one left off without re-reading every doc or
re-discovering what already works.

**Update this file at the end of every phase, before ending the
session.** An out-of-date STATE.md is worse than no STATE.md — it
causes redone work or, worse, confidently broken assumptions.

---

## Current phase

`Phase 8 — DONE. Next up: Phase 9 (styling pass).`

## Last commit

`79d09da — feat: santali contrast demo control`

## What is confirmed working right now

### Phase 0 — Scaffolding — DONE 2026-09-05
- What works: `backend/` FastAPI app boots, all seven routes register and
  return `501` with a message naming the PLAN.md phase that wires them.
  `GET /health` returns `{"ok": true}`. `frontend/` Vite + React scaffold
  builds clean (`npm run build`) and steps through the three empty screens.
- Verified by: an in-process TestClient run asserting `/health` plus a 501
  from every stub route, and a successful `vite build`.
- Commit: `scaffold: repo structure, empty routes, empty screens`
- Differences from PLAN.md: none material. `db/schema.sql` is empty as the
  plan specifies — the tables in DATA_DICTIONARY.md §3 go in at Phase 4.

### Phase 1 — Models load and respond — DONE 2026-09-05
- What works: `models/translation.py` (IndicTrans2, hin_Deva -> sat_Olck)
  and `models/tts.py` (four MMS-TTS checkpoints) are ported from
  `research/sih_2026.ipynb` and wired to `POST /translate` and
  `POST /speak`. Both load once at startup via a FastAPI lifespan hook
  plus an `lru_cache`d loader — never per request. `POST /translate`
  with any target but `sat_Olck` returns 501; `POST /speak` with `sat`
  returns 501.
- Verified by curl against a live uvicorn on 127.0.0.1:8000, and the
  output matches the notebook character for character:
  - long textbook sentence -> `... ᱨᱮ ꯒꯦꯍꯨ ᱡᱟᱱᱟᱢᱼᱟ ...`, Meetei Mayek
    contamination present
  - `धान हाट में बिकता है।` -> `ᱦᱟᱛ ᱨᱮ ᱫᱟᱠᱟ ᱟᱹᱠᱷᱨᱤᱧ ᱦᱩᱭᱩᱜᱼᱟ ᱾`, clean Ol Chiki
  - `POST /speak` Ho -> HTTP 200, `audio/wav`, 120,890 bytes, RIFF/WAVE
  - `POST /translate` target `hoc_Deva` -> HTTP 501 with the phrase-bank
    explanation
- Re-run the check any time with `backend/test_contrast.py` (venv python,
  from `backend/`). It drives the real routes through a TestClient and
  asserts both halves of the contrast plus the Ho audio. Per RULES.md §4,
  run it after ANY change to the translation route or wrapper.
- Took longer than PLAN.md expected, and it was the environment, not the
  port. Four separate gotchas, all now written up in RULES.md §8 — the
  big one is that `IndicTransToolkit` no longer builds on Windows
  without MSVC build tools.

  Note when curl-testing by hand on Windows: put the JSON in a UTF-8
  file and use `curl --data-binary @file`. Devanagari typed straight
  into a shell command gets mangled to cp1252, and the model then
  returns a run of `ᱼ` that looks like a model bug but is not.

### Phase 2 — Phrase bank + capability endpoint — DONE 2026-09-05
- What works: `models/phrase_bank.py` holds the four curated entries
  from DATA_DICTIONARY.md §2 and is the source of truth for them.
  `POST /speak` now gates hoc/unr/kru/sck through it — text that is not
  a bank entry returns `{"phrase_bank_only": true, ...}` with the list
  of phrases that ARE available, and no audio. Lookup accepts either the
  Hindi source or the target string, so the caller can send either side.
  `GET /languages` returns the capability list in the DATA_DICTIONARY.md
  §4 shape.
- `/languages` derives each capability from the module that implements
  it — `translation.SUPPORTED_TARGETS`, `phrase_bank.LANGS`,
  `tts.MODELS` — rather than restating them. A language cannot advertise
  a capability no code backs; adding a name without a model yields
  "none", not a false claim.
- Verified by curl against a live uvicorn:
  - `GET /languages` -> sat `full`/`none` with the no-TTS note, and
    hoc/unr/kru/sck all `phrase_bank`/`full`
  - `POST /speak` `{"text": "किसान खेत में धान उगाता है।", "lang": "hoc"}`
    -> HTTP 200 `application/json`, `phrase_bank_only: true`, 362 bytes,
    **no audio**
  - `POST /speak` `{"text": "पानी हमारा जीवन है", "lang": "hoc"}` ->
    HTTP 200 `audio/wav`, 132,154 bytes
- `backend/test_phrase_bank.py` re-runs all of the above plus a check
  that every one of the four languages speaks its own bank phrase
  (hoc/unr/kru/sck all returned RIFF/WAVE), and that no entry claims
  `verified: true`.
- `backend/test_contrast.py` re-run after the `/speak` change: still
  PASS (RULES.md §4).

### Phase 3 — OCR + pedagogy — DONE 2026-09-05
- What works: `POST /ocr` (Tesseract 5.5.3, `hin`) and `POST /simplify`
  (Gemini, prompt in `models/pedagogy.py`). Verified end to end —
  rendered image of `किसान खेत में गेहूँ उगाता है` in, adapted Hindi out:
  - OCR read `कस्िान खेत में गेहूँ उगाता है`, confidence `ok`
  - concept: "Farmers cultivate food crops in their fields."
  - adapted: `किसान खेत में काम करता है।` / `वह खेत में धान उगाता है।`
  - substitution: गेहूँ -> धान, "Paddy (rice) is the main staple crop
    grown in Jharkhand villages, whereas wheat is less common."
- `backend/test_ocr_pedagogy.py` re-runs it. The test renders its own
  image with PIL rather than carrying a photo fixture, so it works on a
  fresh clone — but that means it tests clean rendered text, not a real
  phone photo. A real photo will read worse.
- Readability is measured in `models/pedagogy.py`, not asked of the
  model. A model counting its own words is a claim; this is a
  measurement.

### Phase 4 — Database + corrections — DONE 2026-09-05
- What works: `db/schema.sql` creates `lessons` and `corrections`,
  applied by `db.init()` from the startup lifespan and safe to re-run.
  `POST /correct` writes one row and returns `{"id": N, "logged": true}`;
  `GET /corrections/count` returns `{"count": N}`.
- Verified by curl against a live uvicorn: count 0 -> POST /correct ->
  `{"id":1,"logged":true}` -> count 1, with `db/boli.sqlite` created on
  disk. `backend/test_corrections.py` re-runs the whole thing against a
  temp database, including that a rejected correction writes nothing.
- The dev database was deleted after the curl run. A leftover test row
  would inflate the "N corrections collected" counter the frontend
  shows, and that counter is supposed to be honest, small and real.
- Nothing writes the `lessons` table yet — that is the Phase 7 result
  flow. `/correct` therefore stores `lesson_id` without checking it
  exists; dropping a teacher's correction over a bookkeeping detail
  would lose real data.

### Phase 5 — Frontend Capture screen — DONE 2026-09-05
- What works: `screens/Capture.jsx` takes a typed Hindi sentence or a
  photo. A photo goes to `POST /ocr` via `src/api.js` and the result
  lands in the textarea, editable. `App.jsx` now holds `hindiText` and
  `selectedLangs` and passes them forward (ARCHITECTURE.md §5).
- Verified: `npm run build` clean, `npm run lint` (oxlint) clean, and
  the exact cross-origin path the browser will take proven by curl —
  the `OPTIONS /ocr` preflight from `Origin: http://localhost:5173`
  returns `access-control-allow-origin: *`, and a multipart upload with
  that Origin returns `{"text": "कस्िान खेत में गेहूँ उगाता है",
  "confidence": "ok"}`.
- **Not verified by me: the screen in an actual browser.** There is no
  browser driver in this environment, so the build, the lint and the
  API contract are checked but the click-through is not. Open
  `npm run dev` and try it before trusting it.
- The OCR note under the textarea always tells the teacher to check the
  text, not only on low confidence. That run returned `confidence: ok`
  while still misreading किसान as कस्िान, so a note shown only on low
  confidence would stay hidden for exactly the failure that needs it.
- Confirmed working in a real browser by the user on 2026-09-05: typed
  text, navigation, and photo upload against a local backend.

### Phase 6 — Frontend Language select — DONE 2026-09-05
- What works: `screens/LanguageSelect.jsx` fetches `GET /languages` on
  mount and renders a multi-select chip per language, with loading,
  error and retry states. Nothing about a language is hardcoded — the
  list, the wording and the styling hook all come from the response.
- **The boundary is visible on screen, three ways at once.** Languages
  are split into "Real translation" and "Curated phrase bank" groups
  with their own headings and explanations; each chip carries a badge
  ("AI translation" / "Phrase bank only"); and each chip spells out what
  that means in a sentence. The phrase-bank group states plainly that no
  translation model exists for those languages and that the phrases are
  "pending validation" per PRD.md §4.
- Colour is never the only cue. The visual distinction is carried by
  group headings and badge text, with the solid-vs-dashed left border as
  a redundant second signal, so it survives greyscale, a colourblind
  reader and a screen reader. Chips are real checkboxes with labels, so
  keyboard and screen-reader use work without extra ARIA.
- Verified: `npm test` (7 assertions, Node's built-in runner) passes,
  `npm run lint` and `npm run build` clean, and the cross-origin
  `GET /languages` returns 200 with the allow header from
  `Origin: http://localhost:5173`.
- The test fixture in `frontend/test/capability.test.js` was diffed
  field-by-field against the live `/languages` response on 2026-09-05
  and matches exactly. Re-check that if the endpoint changes; a stale
  fixture would let the tests pass while the screen lied.
- **Not verified by me: the screen in a real browser.** No browser
  driver here — same limitation as Phase 5.
- Confirmed working in a real browser by the user on 2026-09-05: both
  groups render, badges and explanations show, Santali reads distinctly
  from the phrase-bank four, and the disabled Next button reads "Pick at
  least one language".

### Phase 7 — Frontend Result screen — DONE 2026-09-05
- What works: `screens/Result.jsx` runs `/simplify` -> `/translate`
  (only where a real model exists) -> `/speak` (only where a voice
  exists), in sequence per ARCHITECTURE.md §5. Renders the adapted
  Hindi with substitutions and readability, per-language output, an
  `<audio>` player per language, and a correction form per result.
- **The boundary is enforced by construction, not by a check.**
  `translateTargetFor()` returns null for every phrase-bank language, so
  the `/translate` request is never built for Ho/Mundari/Kurukh/Sadri.
  Four tests in `frontend/test/capability.test.js` pin that, including
  that the API's capability field beats the code map both ways.
- Verified by driving the exact request sequence against a live backend
  (scratch database, separate port) using the same `capability.js` the
  screen imports. Selected Santali + Ho + Kurukh; the resulting call log
  was:

  ```
  GET /languages, POST /simplify,
  POST /translate x2   (Santali only, one per adapted sentence)
  POST /speak x4       (Ho and Kurukh; Santali skipped, tts=none)
  GET /corrections/count, POST /correct, GET /corrections/count
  ```

  Ho and Kurukh were skipped at translate with "no target
  (phrase_bank)", Santali was skipped at speak with "no voice
  (tts=none)", both phrase-bank languages returned the
  `phrase_bank_only` refusal for the teacher's own sentence, and playing
  a bank phrase returned real audio (124,986 and 127,034 bytes).
  `POST /correct` took the count 0 -> 1.
- **Not verified by me: the screen in a real browser.** Same limitation
  as Phases 5 and 6 — the request sequence and the pure logic are
  checked, the rendering and clicking are not.

### Contract changes — DONE 2026-09-05 (commit bb471e9)
Both were documented in ARCHITECTURE.md §3 and DATA_DICTIONARY.md §4
before the code was written (RULES.md §6).
- `/translate` now returns `script_contamination`, from the existing
  `contains_meetei_mayek()`. The Result screen shows a visible note on
  any contaminated line rather than rendering it like clean output.
  `test_contrast.py` asserts the flag both ways, so the P0 test pins it.
- `POST /lessons` writes one row and returns its id; screen 3 calls it
  first so corrections reference a real lesson instead of `lesson_id 0`.
  Minimal by design — `adapted_text` and `santali_translation` stay null.
  Screen 1 tracks whether the text came from a photo or a keyboard.
- Verified live: `POST /lessons` -> id, a correction linked to it, and
  the flag true for the textbook sentence, false for the adapted one.

### Phase 8 — Santali contrast demo control — DONE 2026-09-05
- What works: two buttons on screen 1, behind a "Why simplifying
  matters" toggle. The sentence pair is hardcoded per the PLAN.md Phase 8
  decision; the translations are live, and the Broken/Clean verdict comes
  from `script_contamination`, not from a canned string.
- Verified live: the textbook sentence returned
  `script_contamination=true` and `धान हाट में बिकता है।` returned false,
  so the control renders Broken then Clean.
- The label states that only the input is fixed, and that neither line
  has been checked by a Santali speaker — what is verified is the script
  behaviour, not the translation quality.
- Three frontend tests pin the pair to the one `test_contrast.py`
  asserts on, including an explicit assertion that neither half is
  `किसान खेत में धान उगाता है।`. 14 frontend tests passing.

## What is known broken or not yet attempted

- **The pedagogy step's own output is not guaranteed to translate
  cleanly.** Measured on this run: of the two adapted sentences Gemini
  produced, `किसान खेत में काम करता है।` translates to clean Ol Chiki, but
  `वह खेत में धान उगाता है।` still leaks Meetei Mayek (`ꯆꯦꯡ`) — the same
  धान behaviour recorded in PRD.md §5. So simplification improves the
  odds, it does not guarantee a clean translation, and the live
  simplify-then-translate path in Phase 7 can still show contaminated
  output. Do not paper over this with a post-filter or by tuning the
  prompt to dodge specific words: the gap is real and PRD.md §4 says
  the gap is part of the pitch. Phase 8's demo control should use the
  verified fixed pair rather than whatever the LLM happens to return.
- **OCR is not exact.** Tesseract reorders some Devanagari vowel signs —
  किसान reads back as कस्िान — while reporting `confidence: ok`. So the
  confidence flag catches bad *images*, not bad *encoding*, and the
  teacher's ability to hand-edit the text on screen 1 is load-bearing,
  not a nicety. Do not add a reordering hack (RULES.md §8).
- **The phrase bank holds exactly four entries, one phrase per
  language** — all four are the same Hindi sentence, "पानी हमारा जीवन है".
  So any demo of Ho/Mundari/Kurukh/Sadri audio can only say that one
  sentence. Expanding it is allowed and encouraged (DATA_DICTIONARY.md
  §2 gives the rules), and is probably the cheapest way to make the demo
  cover more classroom topics.
- **No phrase-bank entry has been checked by a native speaker.** Every
  `verified` is False and must stay False until one actually is.
- The `lessons` table exists but is never written; the Phase 7 result
  flow is what fills it.
- Corrections are logged and nothing more. No retraining, and the
  correction is not applied to what the teacher sees next. Do not let
  any UI copy imply otherwise (PRD.md §3).
- The backend only starts from inside `backend/`. Both the
  `static/audio` static mount and `DATABASE_PATH`'s default are relative
  paths, so `uvicorn main:app` from the repo root fails on boot. Same
  for the test scripts. Harmless locally, worth fixing in Phase 10
  before it becomes a deploy-day surprise.
- `lessons` rows record only the submission. `adapted_text` and
  `santali_translation` are never written, so the table cannot tell you
  what the teacher was actually shown. Fine for linking corrections;
  not enough to reconstruct a session.
- The pedagogy step depends on a third-party service that goes down. A
  Gemini 503 ("high demand") was hit during Phase 8 verification. It
  surfaces as a readable 502 rather than a crash, but the whole result
  flow stops there, because `/simplify` runs first. Worth thinking about
  before a live demo: a Gemini outage currently takes the entire Result
  screen with it, including the languages that need no LLM at all.
- For a phrase-bank language, the correction form's "original" is the
  text BOLI was asked to speak, not the phrase bank's target string —
  `/speak` returns audio bytes, not the entry it matched, so the
  frontend never learns which entry was used.
- `frontend/test/capability.test.js` hardcodes a copy of the
  `/languages` response. It is verified to match today, but nothing
  automatically re-checks it — if `/languages` changes shape, the tests
  keep passing against the old fixture.
- The frontend points at `http://127.0.0.1:8000` unless `VITE_API_BASE`
  is set. Phase 10 has to set that at build time for the deployed
  frontend.
- Startup loads all five models before serving, so a cold `uvicorn` boot
  takes roughly a minute. Fine for a demo; worth revisiting if it makes
  Phase 10's deploy time out.

## Decisions made that aren't obvious from the docs alone

*(Use this section for the small judgment calls that happen mid-build
and won't be captured elsewhere — e.g. "chose Render over HF Space
because X." Keep entries short and dated.)*

- 2026-09-05 — **DECIDED: `backend/models/phrase_bank.py` is the single
  source of truth for the phrase bank, and there is no `phrase_bank`
  table.** DATA_DICTIONARY.md used to contradict itself here (§2 named
  the module, §3's schema comment named the table); §3's `CREATE TABLE
  phrase_bank` block has been removed and both sections now say the
  same thing. The reason is not tidiness: a database copy would let an
  entry's `verified` flag be flipped by a runtime `UPDATE`, where code
  requires a reviewed commit. That flag is exactly the claim RULES.md §2
  says must never be softened quietly, so it does not get a path that
  bypasses review.
- 2026-09-05 — `script_contamination` is deliberately named for what it
  measures. `false` means no Meetei Mayek was found and nothing more —
  it is not a claim the translation is correct, and the docs say so.
- 2026-09-05 — The demo control translates live rather than showing a
  stored output string. Hardcoding the *input* pair is what makes the
  demo reliable; hardcoding the *output* would make it a screenshot
  pretending to be a model. The Broken/Clean verdict comes from the
  flag the backend actually returned on that request.
- 2026-09-05 — Screen 1 keeps `source_type` as `"ocr"` even after the
  teacher edits the text, because it did come off a photo. It resets to
  `"typed"` only when the box is cleared completely.
- 2026-09-05 — `CorrectionForm` renders nothing when it has no lesson
  id, rather than offering a correction that would fail on submit.
- 2026-09-05 — The Result screen sends the teacher's ORIGINAL Hindi to
  `/speak` for phrase-bank languages, not the adapted Hindi. The bank is
  keyed on Hindi source strings, and the adapted text is whatever the
  LLM produced that run, so it would essentially never match. On a miss
  the screen renders the refusal and offers the phrases that do exist,
  each playable.
- 2026-09-05 — A `/speak` failure for one language is caught per
  language and rendered in that language's block. One checkpoint failing
  must not throw away the other languages' results.
- 2026-09-05 — `models/pedagogy.py` now catches `requests` exceptions
  and re-raises them as a `RuntimeError` the route turns into a 502 with
  a readable message. Found the hard way: a real `ReadTimeout` during
  the Phase 7 flow test escaped as a bare HTTP 500 "Internal Server
  Error", which is exactly the silent failure RULES.md §3 forbids.
  `test_ocr_pedagogy.py` now simulates a timeout and asserts the 502.
- 2026-09-05 — All UI copy about what a language can do lives in
  `frontend/src/capability.js`, not inside the components. Same reason
  the pedagogy prompt lives in one file (RULES.md §3): this text is the
  UI half of PRD.md §4's boundary, so it should take one diff in one
  place to change — and keeping it out of JSX means it can be tested
  with Node's built-in runner and no browser, no framework, no new
  dependency.
- 2026-09-05 — `describeCapability()` covers every combination of
  `translation` and `tts` the API could return, including ones no
  language currently has. An unhandled pair would render as blank space,
  and blank space on that screen reads as "no limitations". There is a
  test asserting each combination produces real text.
- 2026-09-05 — `groupLanguages()` gives an unrecognised `translation`
  value its own group rather than dropping it. A language silently
  missing from the screen is the one failure that would let a teacher
  assume a capability nobody claimed.
- 2026-09-05 — The "pending validation" line on the phrase-bank group is
  static text, not driven by the `verified` flags in
  `models/phrase_bank.py` (`/languages` does not carry them). Every entry
  is currently unverified so it is accurate, and if one is ever verified
  the text errs toward understating. Revisit when the first entry is
  actually confirmed by a speaker.
- 2026-09-05 — `src/api.js` surfaces FastAPI's `detail` string straight
  to the teacher rather than a generic "something went wrong". The
  backend's messages are written to be read by one (RULES.md §3), so
  replacing them with a generic string would throw away the useful half.
- 2026-09-05 — `schema.sql` adds `IF NOT EXISTS` to each `CREATE TABLE`
  so startup can apply it on every boot. The column definitions are
  otherwise exactly DATA_DICTIONARY.md §3.
- 2026-09-05 — Only the Gemini provider is implemented in
  `models/pedagogy.py`, because that is what `LLM_PROVIDER` is set to.
  Another provider raises a clear error naming the file to change,
  rather than three client implementations where one is exercised.
  Model pinned to `gemini-3.6-flash`: `gemini-2.5-flash` is closed to
  new API keys.
- 2026-09-05 — The Gemini call uses `responseMimeType: application/json`
  with a `responseSchema`, so the shape is enforced by the API instead
  of by parsing markdown fences out of prose.
- 2026-09-05 — OCR lives in `routes/ocr.py`, not `models/ocr.py`. It is
  a local library call with no checkpoint to cache, and
  ARCHITECTURE.md §2 lists only three model wrappers.
- 2026-09-05 — `/speak`'s phrase-bank lookup matches on either the
  Hindi source or the target text, after collapsing whitespace. Lenient
  about which side the caller sends, strict about there being a match:
  anything unmatched is refused. Matching is exact, not fuzzy — a
  near-miss is a miss, because "close enough" is how unchecked text
  would get spoken.
- 2026-09-05 — `/languages` reports `tts: "full"` for the four
  phrase-bank languages, per ARCHITECTURE.md §3 and DATA_DICTIONARY.md
  §4. That is about the checkpoint, which really can speak any text in
  the right script; the limitation that we only have *checked* text for
  bank phrases is carried by `translation: "phrase_bank"`. Worth
  re-reading if the UI ever makes that pair look like more than it is.
- 2026-09-05 — **The contrast is driven by vocabulary, not sentence
  length.** PRD.md §5 and PLAN.md Phase 8 describe it as "long sentence
  vs short sentence", and that framing is imprecise. Verified through
  the API: of the three adapted sentences in the notebook,
  `किसान खेत में धान उगाता है।` still leaks Meetei Mayek (`ꯆꯦꯡ`) despite
  being short, because धान is out-of-domain exactly like गेहूँ. The two
  that come back clean are `धान हाट में बिकता है।` and
  `किसान पैसे कमाता है।`. README.md already had this right ("leaks on
  out-of-domain vocabulary (गेहूँ, धान)"). **Phase 8's demo control must
  use a pair that actually holds** — the recommended pair is the long
  textbook sentence vs `धान हाट में बिकता है।`, which is the pair
  `test_contrast.py` asserts on.
- 2026-09-05 — Python deps live in `backend/.venv`, not the global
  interpreter, so the `transformers==4.45.2` pin cannot break anything
  else on this machine. Run backend commands with
  `./.venv/Scripts/python.exe` from `backend/`.
- 2026-09-05 — `IndicTransToolkit` is pinned to commit `0c607654e8`
  (v1.0.2, the last pure-Python one). Master needs a C compiler on
  Windows. See RULES.md §8.
- 2026-09-05 — `/speak` returns wav bytes in the response body rather
  than writing a file into `static/audio/` and returning a URL. Simpler,
  nothing to clean up, and it matches ARCHITECTURE.md §3's contract. The
  static mount stays for whenever a downloadable worksheet needs it.
- 2026-09-05 — Frontend navigation is a `useState` step index in
  `App.jsx`, not `react-router`. The three screens are strictly linear and
  pass state forward (ARCHITECTURE.md §5), so a router would have added a
  dependency and prop plumbing for nothing. Add react-router only if a
  screen ever needs its own shareable URL.
- 2026-09-05 — Vite scaffold's demo assets (`src/assets/`, `App.css`,
  `public/icons.svg`, its README) were deleted rather than left in place,
  so the Phase 9 styling pass starts from a blank sheet.
- 2026-09-05 — Scope locked: Santali gets real translation, Ho/Mundari/
  Kurukh/Sadri get curated phrase bank only, per PRD.md §4. This was a
  deliberate finding from research (no parallel corpus exists for these
  four languages, confirmed by testing IndicTrans2 directly), not a
  shortcut.

## Environment status

- [x] `HF_TOKEN` obtained and working (in `backend/.env`, gitignored)
- [x] IndicTrans2 gated repo access approved
- [x] `transformers==4.45.2` pin confirmed necessary (see RULES.md §8)
- [x] Backend running locally, all five models loading and responding
- [x] Frontend running locally (`npm run build` clean, three screens step)
- [x] Tesseract 5.5.3 installed with the `hin` pack (not on PATH; the
      route falls back to the standard Windows install path)
- [x] `LLM_API_KEY` + `LLM_PROVIDER=gemini` set and working
- [ ] Deployed backend URL: *(none yet)*
- [ ] Deployed frontend URL: *(none yet)*

## The one thing to never break

The Santali long-vs-short translation contrast (long textbook sentence
→ visible Meetei Mayek script contamination; short adapted sentence →
clean Ol Chiki). This is the single most important reproducible finding
in the whole project — PRD.md success criteria, PLAN.md Phase 1 and
Phase 8. **If a change to the translation route ever breaks this,
that is a P0 bug, not a nice-to-fix-later.**

Last verified working: 2026-09-05, through `POST /translate` on a live
uvicorn — not just in the notebook. Re-check with
`backend/test_contrast.py`. Note the correction below: the clean half of
the pair must be `धान हाट में बिकता है।` or `किसान पैसे कमाता है।`, NOT
`किसान खेत में धान उगाता है।`, which still contaminates.

## Open questions / blockers

- Native speaker validation for Ho/Mundari/Kurukh/Sadri phrase bank
  entries — not yet obtained. Do not change `verified` to `true` in
  DATA_DICTIONARY.md's phrase_bank table until this happens for real.
- Deployment target not yet chosen (Render vs. persistent HF Space) —
  decide in Phase 10, not before.

---

*Template for adding a new phase-completion entry — copy this block
into "What is confirmed working" as each phase finishes:*

```
### Phase N — <name> — DONE <date>
- What works: ...
- Commit: <hash or message>
- Anything that took longer/differently than PLAN.md expected: ...
```