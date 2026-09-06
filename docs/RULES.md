# RULES — BOLI

These are standing instructions for whoever (human or Claude Code) is
writing code in this repo. Read PRD.md and ARCHITECTURE.md first — this
file is enforcement, not context.

## 1. Git discipline — commit early, commit often

- **Commit at the end of every phase in PLAN.md, no exceptions.** A
  phase is not done until it is committed.
- Also commit at any natural sub-checkpoint within a long phase — e.g.
  if Phase 1 takes a while, commit after TTS works, again after
  translation works, rather than one giant commit at the end.
- **Never leave more than ~30 minutes of work uncommitted.** If a
  session gets interrupted, we should never lose more than that.
- Commit message format: `<type>: <what, in plain language>`
  - Types: `feat`, `fix`, `style`, `chore`, `docs`, `test`
  - Good: `feat: /speak endpoint returns real wav bytes for Ho`
  - Bad: `update`, `wip`, `stuff`
- After committing, update STATE.md's "last commit" line so a fresh
  session can see where things stand without running `git log`.
- Push after every commit if a remote is configured — do not let work
  live only on a local machine overnight.

## 2. The one rule that overrides all others: the honesty boundary

PRD.md §4 draws a hard line between real translation (Santali only)
and curated phrase bank (Ho/Mundari/Kurukh/Sadri). **This line must
never be blurred in code, UI copy, or comments, under any
circumstance, including when it would make a demo look more
impressive.**

Concretely:
- Never write a translation function stub for Ho/Mundari/Kurukh/Sadri
  that "just calls IndicTrans2 anyway" because it doesn't error — it
  will silently produce nonsense. If asked to "add translation" for
  these languages, refuse and point back to this file.
- Never remove or soften "phrase bank only" labels from the UI to
  make a screen look more feature-complete.
- Never claim native-speaker-verified accuracy anywhere. The correct
  phrase is always "pending validation" until a real human speaker
  has actually confirmed it — check STATE.md for whether that has
  happened before changing this language.

If you (Claude Code) are ever unsure whether an output crosses this
line, stop and ask, don't guess in the impressive direction.

## 3. Model code conventions

- All model loading goes through the cache pattern in
  ARCHITECTURE.md §4 — load once at import/startup, never per-request.
- Prompts (for the pedagogy LLM call) live in `models/pedagogy.py` as
  named constants, never inline in route files. If a prompt changes,
  that's a one-line diff in one file.
- Every model wrapper function should fail loudly with a clear message,
  not silently return empty/None. A teacher-facing error message
  ("couldn't process this text, try a shorter sentence") is fine; a
  silent failure is not.

## 4. Testing discipline

- Before marking any phase in PLAN.md complete, actually run the
  relevant test described in that phase — do not assume porting code
  preserved its behavior.
- The Santali long-vs-short contrast (PRD.md §5, PLAN.md Phase 1 and 8)
  is the single most important behavior in this app. Re-verify it after
  any change touching the translation route or model wrapper, not just
  when first built.

## 5. Frontend conventions

- Language capabilities are always fetched from `/languages`, never
  hardcoded in a component. If the backend's capability list changes,
  the frontend should not need a code change to reflect it.
- Mobile-first CSS — the primary user is on a phone screen, test at
  narrow widths first, not as an afterthought.
- No dark patterns, no fake loading spinners to "feel more AI" — if
  something is fast, show it fast.

## 6. Scope discipline

- Do not add features not listed in PRD.md or PLAN.md without
  updating those docs first. If something seems missing, add it to
  PLAN.md as a new phase rather than building it ad hoc.
- Do not add authentication, user accounts, or any multi-tenant
  structure — explicitly out of scope, see PRD.md §6.
- Do not attempt to fine-tune any model in this repo. Every model here
  is a pretrained checkpoint used as-is.

## 7. When something breaks

- If a phase's test fails, fix it before moving on — do not comment
  out a failing check and continue.
- If a model call fails in a way that seems environmental (rate limit,
  gated repo, version mismatch), document the fix in this file's
  changelog section below so it isn't rediscovered from scratch next
  session.

## 8. Known environment gotchas (append to this as you hit more)

- `IndicTransToolkit` requires `transformers==4.45.2` pinned, and a
  runtime restart after installing — newer transformers versions break
  its internal import of `PreTrainedTokenizerBase`.
- `ai4bharat/indictrans2-indic-indic-dist-320M` is a gated HF repo —
  requires accepting terms on the model page and an `HF_TOKEN` with at
  minimum Read access.
- MMS-TTS checkpoints each expect a specific script, undocumented on
  the model card — inspect `tokenizer.get_vocab()` before assuming
  input format. Ho/Mundari (`hoc`/`unr`) expect **Odia script**, not
  Devanagari.

- **`IndicTransToolkit` from master does not install on Windows.** Its
  `processor.py` was Cythonised in Feb 2025, so `pip install git+...`
  now wants MSVC 14+ build tools, and PyPI ships no Windows wheel. Use
  the last pure-Python commit instead (v1.0.2):
  `pip install --no-build-isolation --no-deps git+https://github.com/VarunGumma/IndicTransToolkit.git@0c607654e8`
  `--no-build-isolation` is required because that commit's `setup.py`
  imports `pkg_resources`, which setuptools >=81 dropped. Install its
  deps separately: `sacremoses sacrebleu sentencepiece` and
  `git+https://github.com/VarunGumma/indic_nlp_library`.
- **Do not pass `token=` to `from_pretrained` for IndicTrans2.** The
  checkpoint ships remote code, and transformers 4.45.2 drops an
  explicit token on the `trust_remote_code` download path — so passing
  a perfectly good token produces a 401 on `configuration_indictrans.py`
  and `modeling_indictrans.py` that env-var auth does not. Put
  `HF_TOKEN` in `backend/.env`, call `load_dotenv()` before importing
  the model module, and pass no token argument at all.
- `load_dotenv()` with no arguments searches upward from **the calling
  file's directory**, not the current working directory. A helper script
  living outside `backend/` silently fails to find `backend/.env`, and
  the symptom looks like a missing token rather than a missing file.
- `starlette`'s `TestClient` needs `httpx2` installed, and only says so
  at import time.
- Tesseract's Windows installer does not add it to PATH, and pytesseract
  reports that as a bare "not installed". `routes/ocr.py` falls back to
  `C:\Program Files\Tesseract-OCR	esseract.exe`, with `TESSERACT_CMD`
  in `.env` overriding both.
- Tesseract reorders some Devanagari vowel signs: किसान comes back as
  कस्िान, because the ि matra is drawn before its consonant but encoded
  after it. The rest of a line reads fine. Do not write an OCR test that
  demands an exact string match, and do not "fix" this with a
  reordering hack — `/ocr` returns a confidence flag and the teacher
  corrects the odd word on screen 1, which is the designed affordance.
- `gemini-2.5-flash` is closed to new API keys. The 404 body names the
  current replacement; `GET https://generativelanguage.googleapis.com/v1beta/models`
  with the key lists what it can actually call. Do not guess a model id.
- **Do not send `response_format={"type": "json_object"}` to an
  OpenAI-compatible gateway without testing that model.** Measured
  2026-09-05 against Experiential Labs: `claude-haiku-4.5` accepts the
  parameter and returns a literal empty `{}`. The call succeeds, so it
  looks like a model problem rather than a parameter problem. Without it
  the same model returns correct JSON, sometimes fenced — strip the
  fence instead. `models/pedagogy.py` does not send it.
- A gateway listing a model in `/v1/models` does not mean the key can
  call it. On Experiential Labs, `gpt-5.6-luna` and `deepseek-v4-flash`
  return `429 free_tier_requires_payment` while `claude-haiku-4.5` works
  on the same key. Same trap as `gemini-2.5-flash` being listed but
  404ing: only an actual completion call proves access.

