-- BOLI schema. Canonical version: DATA_DICTIONARY.md §3.
--
-- IF NOT EXISTS is added here so startup can run this script every boot
-- without erroring; the table definitions themselves match the data
-- dictionary.
--
-- The phrase_bank table from DATA_DICTIONARY.md §3 is deliberately NOT
-- created. §2 of that same file names backend/models/phrase_bank.py as
-- the source of truth for those entries, and two copies would drift.
-- Keeping them in version-controlled code also means flipping an entry's
-- `verified` flag takes a reviewed commit, where a SQLite UPDATE would
-- not — and that flag is exactly the claim RULES.md §2 says must never
-- be softened quietly. Raised in STATE.md for a decision.

-- lessons: one row per teacher submission (capture -> result flow).
-- Written by the result flow in Phase 7; nothing writes here yet.
CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    source_text TEXT NOT NULL,           -- original Hindi, typed or OCR'd
    source_type TEXT NOT NULL,           -- 'typed' | 'ocr'
    adapted_text TEXT,                   -- pedagogy output, JSON-encoded array
    santali_translation TEXT,            -- Ol Chiki, null if not requested
    languages_requested TEXT NOT NULL    -- JSON array, e.g. ["hoc","sat"]
);

-- corrections: teacher-submitted fixes. Logged, never auto-applied.
-- No retraining is triggered by anything in this file (PRD.md §3).
CREATE TABLE IF NOT EXISTS corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER REFERENCES lessons(id),
    lang_code TEXT NOT NULL,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
