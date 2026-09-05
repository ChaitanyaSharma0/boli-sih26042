"""BOLI backend — FastAPI app, route registration only.

Scope boundary (PRD.md §4): Santali is the only language with real
translation. Ho/Mundari/Kurukh/Sadri are phrase-bank + TTS only.
"""

from contextlib import asynccontextmanager

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

app.mount("/audio", StaticFiles(directory="static/audio"), name="audio")

for module in (ocr, pedagogy, translate, speak, correct, languages, lessons):
    app.include_router(module.router)


@app.get("/health")
def health():
    return {"ok": True}
