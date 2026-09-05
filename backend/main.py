"""BOLI backend — FastAPI app, route registration only.

Scope boundary (PRD.md §4): Santali is the only language with real
translation. Ho/Mundari/Kurukh/Sadri are phrase-bank + TTS only.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes import correct, languages, ocr, pedagogy, speak, translate

app = FastAPI(title="BOLI", version="0.1.0")

# ponytail: wide-open CORS, fine for a single-teacher demo backend with no
# auth (ARCHITECTURE.md §7). Lock to the deployed frontend origin in Phase 10.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/audio", StaticFiles(directory="static/audio"), name="audio")

for module in (ocr, pedagogy, translate, speak, correct, languages):
    app.include_router(module.router)


@app.get("/health")
def health():
    return {"ok": True}
