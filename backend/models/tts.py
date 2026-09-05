"""MMS-TTS wrappers. Ported from research/sih_2026.ipynb in Phase 1.

Model IDs and per-language script expectations: DATA_DICTIONARY.md §1.
Models load once into a module-level cache, never per request
(ARCHITECTURE.md §4).
"""
