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

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from db import db  # noqa: E402
from models import translation, tts  # noqa: E402
from routes import (  # noqa: E402
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
    yield


app = FastAPI(title="BOLI", version="0.1.0", lifespan=lifespan)

# ponytail: wide-open CORS, fine for a single-teacher demo backend with no
# auth (ARCHITECTURE.md §7). Lock to the deployed frontend origin in Phase 10.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolved against this file, not the working directory: the app must
# start the same way from backend/, from the repo root, or from / in a
# container (PLAN.md Phase 10).
_AUDIO_DIR = Path(__file__).resolve().parent / "static" / "audio"
_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=_AUDIO_DIR), name="audio")

for module in (ocr, pedagogy, translate, speak, correct, languages, lessons):
    app.include_router(module.router)


@app.get("/health")
def health():
    return {"ok": True}
