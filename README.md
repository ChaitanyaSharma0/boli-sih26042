# boli-sih26042

# BOLI — Mother-tongue speech for Jharkhand's classrooms
SIH26042 (problem statement from the Government of Jharkhand) · Smart
Education · Team LARPERS. An independent prototype, not affiliated with
any government body.

Turns a Hindi primary-school lesson into something a child can follow in
their mother tongue — honestly: translation only where a real model
exists, speech only where a real voice exists.

## What runs today
| Language | ISO | Translation | Voice |
|---|---|---|---|
| Santali | sat | IndicTrans2 → Ol Chiki (real AI translation) | none exists anywhere — text only |
| Ho | hoc | none exists — curated phrase bank | facebook/mms-tts-hoc (Odia script) |
| Mundari | unr | none exists — curated phrase bank | facebook/mms-tts-unr (Odia script) |
| Kurukh | kru | none exists — curated phrase bank | facebook/mms-tts-kru |
| Sadri | sck | none exists — curated phrase bank | facebook/mms-tts-sck |

The phrase bank holds 20 entries (5 classroom phrases × 4 languages),
**every one checked by native speakers** on 2026-09-18 (college students
from Jharkhand; names withheld at their request). Text outside the bank
is refused, never guessed.

Around that: lesson input by typing, photo (Tesseract OCR), whole-chapter
PDF (with OCR for PDFs whose Devanagari text layer is broken) or teacher
dictation (Meta MMS ASR); grade-aware simplification for Class 1–5 (LLM);
a Live Classroom mode; a printable worksheet; a downloadable offline
lesson pack; and an **Offline demo** that replays a real recorded lesson
with no backend at all.

## Findings (4 Sep 2026)
- Google Translate: Santali text only, "Listen" disabled. Ho, Mundari,
  Kurukh, Sadri absent entirely.
- No MMS-TTS checkpoint exists for Santali.
- MMS trained Ho/Mundari TTS on **Odia script**; Jharkhand writes them
  in Devanagari / Warang Chiti — transliteration layer required.
- IndicTrans2 leaks Meetei Mayek script on out-of-domain vocabulary
  (गेहूँ, धान). Shorter, culturally localised sentences return clean Ol Chiki.

## Live URLs

| | URL |
|---|---|
| Frontend (Vercel) | https://frontend-henna-one-93.vercel.app |
| Backend (Cloudflare Quick Tunnel) | https://magical-finds-contained-postposted.trycloudflare.com |

> ### Read this before sharing the link
>
> **The backend is not hosted anywhere. It is a tunnel to a laptop.**
> The `trycloudflare.com` URL forwards to `localhost:8001` on one
> developer machine, and it only answers while **both** `uvicorn` and
> `cloudflared` are running on that machine. Close either one, sleep the
> laptop, or lose its network, and the site goes dead — the frontend
> stays up on Vercel and simply cannot reach a backend.
>
> **Restarting `cloudflared` assigns a brand-new random URL.** The
> frontend has the old one compiled into its bundle, because Vite
> inlines `VITE_API_BASE` at build time. So a new tunnel means a new
> Vercel build, every time. There is no way around that short of a
> stable hostname.
>
> Hugging Face now paywalls Docker Spaces, and the Render and Railway
> free tiers cannot hold IndicTrans2 plus four MMS-TTS checkpoints in
> memory at once, so there is currently no free host that fits. This
> tunnel is the honest stopgap, not a deployment.

## Running it locally

One-time setup:

```bash
# backend — from backend/, with .env filled in from .env.example
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
./.venv/Scripts/python.exe -m pip install --no-build-isolation --no-deps   git+https://github.com/VarunGumma/IndicTransToolkit.git@0c607654e8

# frontend — from frontend/
npm install
```

Tesseract with the Hindi (`hin`) pack is needed for photos and chapter
PDFs. The first backend start downloads ~1.7 GB of model weights.

Then, from the repo root in PowerShell:

```powershell
.\start.ps1          # backend on 8001, waits until every model is loaded, then the frontend
```

It opens each server in its own window; close a window to stop it. No
network at the venue? The **Offline demo** button in the header needs no
backend. To refresh what it replays: `cd backend; ./.venv/Scripts/python.exe make_demo.py`.

## Checks

```powershell
.\test.ps1 -Quick    # no models or network: guards, corrections, errors, splitting, frontend
.\test.ps1           # everything, incl. phrase-bank audio, PDF OCR, the contrast, live LLM
```

`backend/test_contrast.py` also takes `--base-url` to run against a
deployed instance, and `frontend/test/degradation.mjs` takes a URL too —
see `docs/DEPLOY.md`.

## Notebook
`research/sih_2026.ipynb` — coverage probe, TTS generation, IndicTrans2 test.
