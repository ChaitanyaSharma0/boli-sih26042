# boli-sih26042

# BOLI — Mother-tongue speech for Jharkhand's classrooms
SIH26042 · Government of Jharkhand · Smart Education · Team LARPERS

Turns a Hindi primary-school lesson into a spoken lesson in a child's
mother tongue — for languages no commercial system supports.

## What runs today
| Language | ISO | Translation Engine | TTS Voice Model | Architecture / Status |
|---|---|---|---|---|
| Santali | sat | Neural MT (IndicTrans2) | AI4Bharat Indic Parler-TTS | Working translation pipeline (Ol Chiki) + neural voice |
| Kurukh | kru | Neural MT (fine-tuned mT5) | Meta MMS-TTS (kru) | Working translation pipeline + spoken voice synthesis |
| Ho | hoc | Linguistic Transfer | Meta MMS-TTS (hoc) | AI-assisted linguistic transfer + spoken voice (Deva→Odia) |
| Mundari | unr | Linguistic Transfer | Meta MMS-TTS (unr) | AI-assisted linguistic transfer + spoken voice (Deva→Odia) |
| Sadri | sck | Morphological Transfer | Meta MMS-TTS (sck) | Morphological/rule-based transfer + spoken voice |

*Arbitrary multi-sentence translation and speech are supported across all 5 target dialects. Translation quality remains subject to field validation with native speakers, with curated phrase-bank fallbacks maintained for offline reliability.*

## Key Technical Findings
- All 5 target languages have working translation pipelines and TTS audio generation.
- MMS trained Ho/Mundari TTS on **Odia script**; BOLI handles script mapping internally from Devanagari.
- IndicTrans2 leaks Meetei Mayek script on out-of-domain vocabulary (गेहूँ, धान); culturally localized pedagogy substitution ensures clean Ol Chiki.
- Kurukh utilizes fine-tuned mT5 (`ankitklakra/hindi-to-kurukh`) with tuned repetition penalty and beam parameters to prevent autoregressive cycling.

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

```bash
# backend — from backend/, with .env filled in from .env.example
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
./.venv/Scripts/python.exe -m pip install --no-build-isolation --no-deps   git+https://github.com/VarunGumma/IndicTransToolkit.git@0c607654e8
./.venv/Scripts/python.exe -m uvicorn main:app --port 8000

# frontend — from frontend/
npm install && npm run dev
```

First backend start downloads ~1.7GB of model weights and warms all five
models before serving.

## Checks

```bash
cd backend  && ./.venv/Scripts/python.exe test_contrast.py      # the P0 contrast
cd backend  && ./.venv/Scripts/python.exe test_phrase_bank.py   # the scope boundary
cd backend  && ./.venv/Scripts/python.exe test_corrections.py   # lessons + corrections
cd backend  && ./.venv/Scripts/python.exe test_ocr_pedagogy.py  # ocr + LLM + retries
cd frontend && npm test                                         # capability copy and rules
```

`test_contrast.py` also takes `--base-url` to run against a deployed
instance. `frontend/test/degradation.mjs` takes a URL too — see
`docs/DEPLOY.md`.

## Notebook
`research/sih_2026.ipynb` — coverage probe, TTS generation, IndicTrans2 test.
