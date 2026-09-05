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

`Phase 0 — not yet started`

## Last commit

`(none yet)`

## What is confirmed working right now

*(nothing yet — this section fills in as phases complete)*

## What is known broken or not yet attempted

- Nothing built yet.

## Decisions made that aren't obvious from the docs alone

*(Use this section for the small judgment calls that happen mid-build
and won't be captured elsewhere — e.g. "chose Render over HF Space
because X." Keep entries short and dated.)*

- 2026-09-05 — Scope locked: Santali gets real translation, Ho/Mundari/
  Kurukh/Sadri get curated phrase bank only, per PRD.md §4. This was a
  deliberate finding from research (no parallel corpus exists for these
  four languages, confirmed by testing IndicTrans2 directly), not a
  shortcut.

## Environment status

- [ ] `HF_TOKEN` obtained and working
- [ ] IndicTrans2 gated repo access approved
- [ ] `transformers==4.45.2` pin confirmed necessary (see RULES.md §8)
- [ ] Backend running locally
- [ ] Frontend running locally
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