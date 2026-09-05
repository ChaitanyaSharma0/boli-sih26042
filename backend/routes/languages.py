"""GET /languages — capability list. Wired in Phase 2.

The frontend renders capability from this response and never hardcodes
it (RULES.md §5).
"""

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/languages")
def languages():
    raise HTTPException(501, "Capability list not wired yet — PLAN.md Phase 2.")
