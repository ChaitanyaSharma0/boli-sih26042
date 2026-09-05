"""POST /simplify — Hindi in, simpler Hindi out.

Hindi to Hindi only. Nothing here crosses the translation boundary in
PRD.md §4. The prompt lives in models/pedagogy.py (RULES.md §3).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models import pedagogy

router = APIRouter()


class SimplifyRequest(BaseModel):
    text: str


@router.post("/simplify")
def simplify(req: SimplifyRequest):
    try:
        return pedagogy.simplify(req.text)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(502, str(e))
