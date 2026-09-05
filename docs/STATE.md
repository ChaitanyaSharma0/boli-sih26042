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

`Phase 1 — DONE. Next up: Phase 2 (phrase bank + /languages).`

## Last commit

`(Phase 1 commit — see git log -1)`

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

## What is known broken or not yet attempted

- `/languages`, `/ocr`, `/simplify`, `/correct` and `/corrections/count`
  are still 501 stubs (Phases 2-4).
- **The phrase bank does not exist in code yet.** `/speak` currently
  synthesises whatever text it is handed for hoc/unr/kru/sck. That is
  not a boundary violation — TTS for those four is genuinely real — but
  the phrase-bank gate in ARCHITECTURE.md §3 lands in Phase 2, and until
  it does nothing stops a caller sending arbitrary text.
- Tesseract (the binary + `hin` language pack) is not installed, and no
  LLM key is set in `.env` — both needed for Phase 3.
- Frontend is still the three empty Phase 0 screens; nothing calls the
  backend yet.
- Startup loads all five models before serving, so a cold `uvicorn` boot
  takes roughly a minute. Fine for a demo; worth revisiting if it makes
  Phase 10's deploy time out.

## Decisions made that aren't obvious from the docs alone

*(Use this section for the small judgment calls that happen mid-build
and won't be captured elsewhere — e.g. "chose Render over HF Space
because X." Keep entries short and dated.)*

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