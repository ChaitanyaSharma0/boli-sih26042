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

`Phase 0 — DONE. Next up: Phase 1 (models load and respond).`

## Last commit

`scaffold: repo structure, empty routes, empty screens`

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

## What is known broken or not yet attempted

- No model has been loaded from the backend yet. Nothing in `models/` is
  more than a docstring; the Colab code is still only in
  `research/sih_2026.ipynb` and has not been ported (Phase 1).
- `HF_TOKEN` has not been obtained or tested, so IndicTrans2 gated access
  is unproven from this machine.
- Heavy deps (`torch`, `transformers==4.45.2`, `IndicTransToolkit`,
  `pytesseract`) are listed in `backend/requirements.txt` but NOT yet
  installed here — only `fastapi`, `uvicorn` and `python-multipart` are.
  Expect the transformers pin and the post-install restart from RULES.md
  §8 to bite at the start of Phase 1.
- Tesseract itself (the binary + `hin` language pack) is not installed.

## Decisions made that aren't obvious from the docs alone

*(Use this section for the small judgment calls that happen mid-build
and won't be captured elsewhere — e.g. "chose Render over HF Space
because X." Keep entries short and dated.)*

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

- [ ] `HF_TOKEN` obtained and working
- [ ] IndicTrans2 gated repo access approved
- [ ] `transformers==4.45.2` pin confirmed necessary (see RULES.md §8)
- [x] Backend running locally (boots, routes register, stubs 501 — no
      models loaded yet)
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

Last verified working: *(not yet ported to backend — currently only
confirmed in the Colab notebook and the standalone Gradio prototype,
see /docs/research/)*

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