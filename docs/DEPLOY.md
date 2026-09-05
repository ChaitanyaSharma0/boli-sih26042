# DEPLOY — BOLI

Runbook for PLAN.md Phase 10. Backend to a Hugging Face Space (Docker
SDK), frontend to Vercel.

Hugging Face rather than Render because the free Render tier cannot hold
IndicTrans2 plus four MMS-TTS checkpoints in memory at once. Docker SDK
rather than Gradio because this is a FastAPI service the React app calls,
not a Gradio UI.

**Status: not yet deployed.** Everything below is prepared and the
verification scripts are ready, but the deploy itself needs credentials
that are not on this machine — see "What is needed" at the bottom.

---

## 1. Backend → Hugging Face Space

The Space repo's root is this repo's `backend/` directory: it already
contains the `Dockerfile` and a `README.md` with the Space front matter
(`sdk: docker`, `app_port: 7860`).

```bash
# One-time: create the Space (Docker SDK) at
#   https://huggingface.co/new-space
# then, from the repo root:
git subtree push --prefix backend https://huggingface.co/spaces/<user>/<space> main
```

Set these as **Space secrets** (Settings → Variables and secrets), never
as plain variables and never committed:

| Secret | Value |
|---|---|
| `HF_TOKEN` | A token with Read scope. IndicTrans2 is gated. |
| `LLM_API_KEY` | The Gemini key. |
| `LLM_PROVIDER` | `gemini` |

`DATABASE_PATH` is not needed; it defaults to a path inside the image.

### What to expect on first boot

The image does not bake in the model weights — they are ~1.7GB and would
make every rebuild enormous. The first boot downloads them and the
lifespan hook warms all five models before the app serves anything, so
**a cold start takes several minutes and `/health` does not answer until
it finishes.** That is the intended trade: slow first boot, fast requests
afterwards (ARCHITECTURE.md §4).

### Known limitation, state it honestly

Storage on a free Space is ephemeral. **Logged corrections do not survive
a restart**, so the "N corrections collected" counter resets. PRD.md §3
calls that log "a durable record"; on this tier it is not one. Either say
so when demoing, or persist to a HF Dataset — which is not built.

---

## 2. Frontend → Vercel

Vercel auto-detects Vite. Point the project at the `frontend/`
directory and set one environment variable:

| Variable | Value |
|---|---|
| `VITE_API_BASE` | `https://<user>-<space>.hf.space` |

**Vite inlines this at build time, not at runtime.** Changing it requires
a redeploy — a running container will not pick up a new value.

---

## 3. Verify against the deployed URLs, not localhost

Deployment breaks subtle things — env vars, model download timeouts,
static paths. Both checks below take a URL for exactly this reason. Run
them against the Space, and do not mark Phase 10 done on localhost runs.

### The contrast test (PLAN.md Phase 1, PRD.md §5)

```bash
cd backend
./.venv/Scripts/python.exe test_contrast.py --base-url https://<space>.hf.space
```

Asserts the textbook sentence still leaks Meetei Mayek, the adapted
sentence comes back clean Ol Chiki, `script_contamination` is true then
false, Ho returns real wav bytes, and both scope-boundary 501s hold.

### The degradation test (PLAN.md Phase 8.5)

```bash
cd frontend
node test/degradation.mjs https://<space>.hf.space
```

This one **needs `/simplify` to actually be failing**, and there is no
way to induce that from outside. Temporarily set the Space's
`LLM_API_KEY` secret to an invalid value, restart the Space, run the
script, then restore the real key. Asserting the property without
inducing the failure would not be a test.

It asserts that Ho, Mundari, Kurukh and Sadri all still return playable
audio while Santali alone is left without a result.

---

## 4. After it is live

- Put both URLs in `README.md` and `STATE.md`.
- Re-run both checks above and record the output in `STATE.md`.
- Consider narrowing CORS in `backend/main.py` from `allow_origins=["*"]`
  to the Vercel origin. It is wide open today, which is fine for a demo
  backend with no auth (ARCHITECTURE.md §7) but is not something to leave
  unexamined once there is a public URL.

---

## What is needed to actually deploy

Neither of these is available in the environment this was prepared in:

1. **A Hugging Face token with write scope**, plus a created Space. The
   token in `backend/.env` is Read-only — enough to pull the gated model
   at runtime, not enough to push a Space.
2. **Vercel access** — the CLI is not installed and there is no session.

Docker is also not installed here, so the `Dockerfile` has **not been
built or run**. It is written against the documented HF Spaces Docker
contract (uid 1000, `$HOME` writable, port 7860) but the first real build
is the first test of it. Expect to iterate on it once, and check the
Space's build logs rather than assuming.
