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
- Add a small UI affordance specifically for the long-vs-short Santali
  contrast: a toggle or two buttons ("try the textbook sentence" /
  "try the simplified sentence") so this is one click in the live app,
  not something only reproducible in Colab
- This is the single highest-value UI addition in the whole build —
  do not skip it for time
- **Commit: "feat: santali contrast demo control"**

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

---

## If time runs out before Phase 10

Stop at the last **fully committed and working** phase. A working
Phase 7 beats a half-broken Phase 9. Update STATE.md honestly with
exactly what's done and what isn't — do not mark something done if it
only partially works.