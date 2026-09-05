# MASTERPROMPT — paste this into Claude Code to start (or resume) work

You are working in the `boli/` repo. Before writing or changing any
code, read these files in this exact order:

1. `docs/STATE.md` — what phase we're on, what's confirmed working,
   what's broken, what decisions are already made. This tells you
   where to actually start. If this is a fresh session, this is the
   most important file in the repo.
2. `docs/PRD.md` — what we're building and, critically, **section 4**,
   the explicit scope boundary between real translation (Santali only)
   and curated phrase bank (Ho/Mundari/Kurukh/Sadri). This boundary is
   non-negotiable. Do not blur it, even if it would make a demo look
   more complete.
3. `docs/ARCHITECTURE.md` — the system design, repo layout, and exact
   API contracts. Build to this shape, don't improvise a different
   structure.
4. `docs/PLAN.md` — the phased build order. Find the current phase
   (from STATE.md) and pick up from there. Do not skip ahead to a
   later phase's work.
5. `docs/RULES.md` — coding conventions, commit discipline, and
   environment gotchas already discovered (section 8 will save you
   from re-hitting bugs we already solved once).
6. `docs/DATA_DICTIONARY.md` — exact model IDs, schema, and API
   response shapes. Copy these exactly; do not guess at a model
   variant or invent a field name.

## Your operating instructions for this session

- **Work one phase at a time**, per PLAN.md. Do not batch multiple
  phases into one session unless explicitly told to.
- **Commit at the end of the phase** (and at sub-checkpoints within a
  long phase), following RULES.md §1's message format. Do not end a
  session with uncommitted work.
- **Update `docs/STATE.md`** before ending the session — current
  phase, what now works, what's still broken, and fill in the
  phase-completion template at the bottom of that file.
- **If the current phase's test/verification step fails, fix it before
  moving on.** A phase is not done because the code runs without
  crashing — it's done when the specific check in PLAN.md passes.
- **If you are ever asked (by me, or inferred from a vague instruction)
  to make Ho, Mundari, Kurukh, or Sadri "actually translate" beyond the
  phrase bank** — stop and flag it. There is no parallel corpus and no
  model for this. Building a fake version that produces plausible-
  looking-but-wrong output is worse than the honest phrase-bank
  limitation. Point back to PRD.md §4 and RULES.md §2.
- **If something in the docs seems wrong or outdated** (e.g. STATE.md
  says a phase is done but the code clearly doesn't work), say so
  explicitly rather than silently working around the discrepancy.

## Quick context if you need the one-paragraph version

BOLI is a hackathon prototype (SIH26042, Government of Jharkhand) that
turns a Hindi primary-school lesson into simplified, translated,
spoken output for children whose mother tongue isn't Hindi. Santali
gets genuine AI translation (IndicTrans2) because it's the only one of
these languages with an open parallel corpus; the other four languages
get real, working text-to-speech but rely on a small hand-curated
phrase bank instead of live translation, because no translation model
exists for them anywhere yet — that gap is itself part of the pitch,
not something to hide.

## Start here

Open `docs/STATE.md` now and tell me the current phase before writing
any code.