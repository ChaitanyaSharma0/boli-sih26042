"""BOLI backend — FastAPI app, route registration only.

Scope boundary (PRD.md §4): Santali is the only language with real
translation. Ho/Mundari/Kurukh/Sadri are phrase-bank + TTS only.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

# uvicorn configures its own loggers but leaves the root logger without a
# handler, so a module logger's output would go nowhere. Without this, the
# error logging in models/pedagogy.py is silently discarded and a 502
# still leaves an empty console.
#
# WARNING, not INFO: this sets the level for every library that propagates
# to root. At INFO, httpx logs a line per outbound request — measured at
# one per successful /simplify — and transformers chatters through model
# warmup, which buries the failures this logging exists to surface.
# Nothing in this app logs below WARNING.
#
# The timestamp is the point: the failure that prompted this was
# unexplainable *after the fact*, and a line you cannot place in time
# cannot be matched to a teacher's report or to the access-log entry for
# the same request.
#
# ponytail: basicConfig silently no-ops if root already has a handler,
# which happens under `uvicorn --log-config` or gunicorn. Add force=True
# if that ever bites.
logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)

from dotenv import load_dotenv

load_dotenv()  # HF_TOKEN must be in the environment before any model loads

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from db import db  # noqa: E402
from models import asr, translation, tts  # noqa: E402
from routes import (  # noqa: E402
    asr as asr_route,
    chapter,
    correct,
    languages,
    lessons,
    ocr,
    pedagogy,
    speak,
    translate,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    # Load every model once at startup, never per request (ARCHITECTURE.md §4).
    # Costs ~a minute on a cold HF cache; makes each teacher request seconds.
    translation.warmup()
    tts.warmup()
    asr.warmup()
    yield


app = FastAPI(title="BOLI", version="0.1.0", lifespan=lifespan)
log = logging.getLogger("boli")


# Registered BEFORE CORSMiddleware so CORS wraps it (the last middleware
# added is the outermost). An unhandled exception would otherwise become a
# 500 in Starlette's outer error layer with no CORS headers; the browser
# then blocks the response and the teacher sees "Couldn't reach the
# server" for a server that answered. This keeps the real message visible.
@app.middleware("http")
async def errors_keep_cors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            {"detail": "Something went wrong on the server. The error has been logged; try again."},
            status_code=500,
        )


# ponytail: wide-open CORS, fine for a single-teacher demo backend with no
# auth (ARCHITECTURE.md §7). Lock to the deployed frontend origin in Phase 10.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    # Custom response headers are invisible to a cross-origin page unless
    # exposed; /speak uses these to name the phrase it spoke.
    expose_headers=["X-Target-Text", "X-Phrase-Bank-Match"],
)

# Resolved against this file, not the working directory: the app must
# start the same way from backend/, from the repo root, or from / in a
# container (PLAN.md Phase 10).
_AUDIO_DIR = Path(__file__).resolve().parent / "static" / "audio"
_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=_AUDIO_DIR), name="audio")

for module in (ocr, chapter, pedagogy, translate, speak, asr_route, correct, languages, lessons):
    app.include_router(module.router)


@app.get("/health")
def health():
    """Liveness plus readiness: which models are actually loaded.

    `ready` is True only once translation, every TTS voice and ASR are in
    memory, so a start script (or a nervous demo) can wait for it instead
    of guessing when warmup has finished.
    """
    models = {
        "translation": translation._load.cache_info().currsize > 0,
        "tts": tts._load.cache_info().currsize == len(tts.MODELS),
        "asr": asr._load_model.cache_info().currsize > 0,
    }
    return {"ok": True, "ready": all(models.values()), "models": models}
