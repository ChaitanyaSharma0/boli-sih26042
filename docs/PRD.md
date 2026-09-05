# PRD — BOLI

**SIH26042** · Government of Jharkhand · Smart Education · Team LARPERS

## 1. Problem

Jharkhand primary classrooms teach in Hindi. Most children arrive speaking
a different mother tongue (Ho, Mundari, Kurukh, Sadri, Santali, etc.).
96% of Jharkhand's children speak an indigenous language at home
(M-TALL / UNICEF survey). Comprehension failure, not ability, is the
primary driver of early dropout — roughly half of Adivasi children are
gone by Class 5.

No commercial tool addresses this. Google Translate's tribal-language
coverage is near-zero, and where it exists (Santali) it is text-only —
no speech output at all. See `/docs/research/google-gap.md` (screenshots
from SIH deck) for evidence.

## 2. Who this is for

**Primary user: the classroom teacher.** One teacher, one Hindi textbook,
up to four different mother tongues in the room, ~35 minutes per period.
They are not a technical user — assume low smartphone literacy, assume
they will use this standing at the front of a classroom, not sitting at
a desk.

**Secondary user (future, not in hackathon scope): the child.** Today's
build outputs audio and text; direct child interaction is a v2 concern.

## 3. What we are building (hackathon scope)

A web app with three screens and one backend, wrapping the models we
have already validated (see `/docs/research/`):

1. **Input** — teacher types or photographs a Hindi lesson sentence.
2. **Language select** — pick which mother tongues are needed.
3. **Output** — simplified text, translated text (Santali only — see
   scope boundary below), and spoken audio in Ho / Mundari / Kurukh /
   Sadri / Santali as applicable. Downloadable/printable worksheet.

Plus a lightweight **teacher correction log** — not live retraining,
just a durable record that the correction loop is architected in.

## 4. Explicit scope boundaries — read this before building anything

**Real, working, and must be demonstrably correct:**
- Hindi → Santali translation (IndicTrans2, Ol Chiki script)
- Speech synthesis in Ho, Mundari, Kurukh, Sadri, Santali-adjacent Hindi
  (MMS-TTS checkpoints — see DATA_DICTIONARY.md for exact model IDs)
- Pedagogy simplification step (LLM call): vocabulary control + cultural
  substitution + sentence splitting, Hindi → Hindi, before translation

**Explicitly NOT real translation — do not fake this:**
- Ho, Mundari, Kurukh, Sadri have **no open parallel corpus** and
  **no translation model exists anywhere**, from us or anyone else.
  These four languages are served via a **curated phrase bank**
  (fixed Hindi phrase → known-correct target text → TTS), not live
  translation. The UI must say this plainly. Do not build a text box
  that pretends to translate into these languages.

**Not in hackathon scope at all:**
- Native mobile app (React Native is the *stated future* architecture,
  not built now — see ARCHITECTURE.md)
- Offline/on-device model execution
- Live model retraining from corrections (log only, for now)
- Any claim of native-speaker-verified translation accuracy — this is
  explicitly pending; do not remove or soften "pending validation"
  language anywhere in the UI or docs.

## 5. Success criteria for the hackathon build

- A teacher can go from "typed/photographed Hindi sentence" to
  "playable audio in a target language" in under 15 seconds, no errors,
  on a phone browser.
- Santali path shows the pedagogy fix live: a long unmodified textbook
  sentence produces visibly broken output (script contamination); the
  same sentence after simplification produces clean output. This
  contrast must be reproducible on demand, not just in a screenshot.
- Every screen states clearly what is real translation vs. curated
  phrase bank. No overclaiming, anywhere, ever.
- Deployed to a permanent public URL (not a Colab-dependent tunnel).

## 6. Non-goals (say no to these if asked mid-build)

- Do not add more languages "for coverage" without a working model
  behind them — a fake language in a dropdown is worse than an honest
  gap.
- Do not build user accounts / auth for the hackathon version.
- Do not attempt to fine-tune any model during the hackathon window —
  every model used is a pretrained, open checkpoint, used as-is.