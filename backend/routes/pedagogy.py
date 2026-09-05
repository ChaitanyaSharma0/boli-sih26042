"""POST /simplify — Hindi -> simplified Hindi. Wired in Phase 3."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class SimplifyRequest(BaseModel):
    text: str


@router.post("/simplify")
def simplify(req: SimplifyRequest):
    raise HTTPException(501, "Pedagogy step not wired yet — PLAN.md Phase 3.")
