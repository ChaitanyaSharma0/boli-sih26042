# PLAN — BOLI

Companion to PRD.md and ARCHITECTURE.md. Read both first.

Each phase below is sized to be completable in one focused session.
**End every phase with a commit** — see RULES.md for message format.
Do not start phase N+1 in the same session unless phase N is committed
and actually working, not just "looks done."

Update STATE.md after every phase — that file is what lets a fresh
Claude Code session pick up context without re-reading this whole plan.

---

## Phase 0 — Scaffolding
- Create repo structure exactly as in ARCHITECTURE.md §2
- `backend/requirements.txt`: fastapi, uvicorn, transformers==4.45.2,
  torch, scipy, pytesseract, python-multipart, git+IndicTransToolkit
- `frontend`: Vite + React scaffold, no logic yet, just routing between
  three empty screens
- `.env.example` with placeholder keys, real `.env` gitignored
- Empty `db/schema.sql`
- **Commit: "scaffold: repo structure, empty routes, empty screens"**

## Phase 1 — Models load and respond (backend only, no frontend yet)
- Port the working Colab code into `models/tts.py`,
  `models/translation.py`, `models/pedagogy.py` — this is copy-and-
  adapt, not new research, the logic is already proven
- Wire `/speak` and `/translate` routes to call them
- Test with `curl`, not the frontend — confirm real audio bytes come
  back, confirm Santali translation still reproduces the Meetei Mayek
  finding on the long sentence and clean output on the short one
- **This phase is not done until the long-vs-short contrast reproduces
  through the actual API**, not just in the notebook. That contrast is
  a PRD success criterion — verify it here, don't assume it survived
  the port.
- **Commit: "feat: model routes wired, translation contrast verified via curl"**

## Phase 2 — Phrase bank + language capability endpoint
- Implement `/languages` exactly per ARCHITECTURE.md §3
- Implement the phrase bank lookup inside `/speak` for hoc/unr/kru/sck
- Test: submitting arbitrary text for Ho returns the phrase-bank-only
  response, not silently wrong audio
- **Commit: "feat: phrase bank enforcement, /languages endpoint"**

## Phase 3 — OCR + pedagogy
- `/ocr` route, Tesseract Hindi
- `/simplify` route, LLM call
- Test with a photographed textbook line end to end: image in, adapted
  Hindi sentences out
- **Commit: "feat: ocr and pedagogy routes"**

## Phase 4 — Database + corrections
- Run `schema.sql` (see DATA_DICTIONARY.md for exact tables)
- `/correct` and `/corrections/count` routes
- **Commit: "feat: correction logging"**

## Phase 5 — Frontend screen 1 (Capture)
- Text input + image upload, calls `/ocr` if image, holds result in state
- No styling polish yet — functional first
- **Commit: "feat: capture screen wired to backend"**

## Phase 6 — Frontend screen 2 (Language select)
- Renders language chips from live `/languages` response — do not
  hardcode the list, per ARCHITECTURE.md §3
- Visually distinguish "full translation" vs "phrase bank" languages —
  this is a PRD requirement, not a nice-to-have
- **Commit: "feat: language select screen, capability-aware rendering"**

## Phase 7 — Frontend screen 3 (Result)
- Fires `/simplify` → `/translate` (Santali only) → `/speak` per
  selected language, in sequence per ARCHITECTURE.md §5
- Audio player per language, correction form per result
- **Commit: "feat: result screen, full flow working end to end"**

## Phase 8 — The demo moment
- Add a small UI affordance specifically for the Santali
  in-domain-vs-out-of-domain vocabulary contrast: a toggle or two
  buttons ("try the textbook sentence" / "try the adapted sentence")
  so this is one click in the live app, not something only
  reproducible in Colab
- **Use the verified sentence pair**, per PRD.md §5:
  - out-of-domain (breaks): `किसान खेत में गेहूँ उगाता है और उसे बाज़ार में बेचता है।`
  - in-domain (clean): `धान हाट में बिकता है।`
  Do **not** use `किसान खेत में धान उगाता है।` as the clean half — it is
  short and adapted but still leaks Meetei Mayek. Any replacement pair
  must be checked against the live API first, because the same word can
  be clean in one sentence and not another.
- **Hardcode that pair. Do not call `/simplify` live and translate
  whatever comes back.** The LLM is not deterministic, and its output
  can contain a word that contaminates — measured in Phase 3, where one
  of two adapted sentences leaked Meetei Mayek on धान. A demo control
  that sometimes fails to demonstrate the thing it exists to
  demonstrate is worse than no control.
- **Label it "verified example", not "live pipeline output."** The two
  buttons show a fixed, checked pair, and the UI must say so. This is
  the same honesty rule as everywhere else (RULES.md §2): the claim on
  screen has to match what the code actually did.
- The free-text simplify-then-translate flow elsewhere in the app stays
  live and unpredictable, and that is fine — PRD.md §4 says the gap is
  part of the pitch, not something to hide. The difference is that the
  demo control makes a specific promise about what it will show, and
  the free-text flow does not.
- This is the single highest-value UI addition in the whole build —
  do not skip it for time
- **Commit: "feat: santali contrast demo control"**

## Phase 8.5 — Graceful degradation when the LLM is unavailable

Added 2026-09-05, after the failure was observed live rather than
predicted: Gemini returned 503 "high demand" during Phase 8
verification, and because `/simplify` runs first and throws to a single
outer catch, the whole Result screen died — including Ho, Mundari,
Kurukh and Sadri, which do not use the LLM at all.

This is a functional correctness bug, not a styling concern, so it goes
before Phase 9.

- **Ho/Mundari/Kurukh/Sadri must render and play normally when
  `/simplify` fails, times out, or is merely slow.** They depend on the
  phrase bank and TTS, neither of which touches the LLM. Their `/speak`
  calls therefore move *before* `/simplify` in the sequence, so a slow
  pedagogy call cannot delay them either — see ARCHITECTURE.md §5.
- **A `/simplify` failure is scoped to Santali**, shown as an inline
  error in Santali's own section. It must never abort the other
  languages' results.
- Do **not** paper over the failure by translating the unsimplified text
  instead. That would produce output the pedagogy step exists to
  prevent, and present it as a normal result.
- **Verify with an induced failure**, not by reasoning about it: point
  `LLM_API_KEY` at an invalid value, run the flow, and confirm the
  phrase-bank languages still return audio while Santali shows its own
  error.
- **Commit: "fix: /simplify failure no longer takes down the other languages"**

## Phase 9 — Styling pass
- Apply the visual language from the SIH deck (navy/green palette,
  card-based layout) so the app and the deck feel like one product
- Mobile-first — the primary user is on a phone
- **Commit: "style: visual pass matching deck design language"**

## Phase 10 — Deploy
- Backend to Render/HF Space, frontend to Vercel/Netlify
- Update all docs and the SIH deck with the permanent URLs
- Re-verify phase 1's contrast test against the *deployed* URL, not
  localhost — deployment often breaks something subtle (env vars,
  model download timeouts, static file paths)
- **Commit: "chore: deployed, docs updated with live URLs"**

## Phase 11 — Corrections to a HF Dataset (optional, post-deploy)

Not urgent, and explicitly after Phase 10. Worth doing properly rather
than working around.

The corrections log is written to local SQLite, and a free Hugging Face
Space has ephemeral storage, so **corrections do not survive a restart**
(PRD.md §3). Writing them to a Hugging Face Dataset repo instead is
free, persists properly, and matches the "corpus we are building" pitch
better than a file that vanishes.

- Swap the `corrections` writes in `backend/routes/correct.py` for
  appends to a Dataset repo; keep the `/correct` and
  `/corrections/count` contracts exactly as ARCHITECTURE.md §3 defines
  them, so the frontend needs no change.
- Needs an `HF_TOKEN` with **write** scope — the current one is Read.
- Keep it honest either way: this makes the log durable, it still does
  not retrain anything (PRD.md §3).
- Until this lands, PRD.md §3's warning stands and the gap gets stated
  out loud rather than papered over.
- **Commit: "feat: corrections persist to a hf dataset"**

---

## If time runs out before Phase 10

Stop at the last **fully committed and working** phase. A working
Phase 7 beats a half-broken Phase 9. Update STATE.md honestly with
exactly what's done and what isn't — do not mark something done if it
only partially works.