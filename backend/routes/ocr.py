"""POST /ocr — Tesseract Hindi. Wired in Phase 3."""

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()


@router.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    raise HTTPException(501, "OCR not wired yet — PLAN.md Phase 3.")
