-- BOLI schema. Canonical version: DATA_DICTIONARY.md §3.
--
-- IF NOT EXISTS is added here so startup can run this script every boot
-- without erroring; the table definitions themselves match the data
-- dictionary.
--
-- There is no phrase_bank table, by decision (2026-09-05). The curated
-- entries live only in backend/models/phrase_bank.py, which is the
-- single source of truth. A database copy would let an entry's
-- `verified` flag be flipped by a runtime UPDATE; in code it takes a
-- reviewed commit, and that flag is exactly the claim RULES.md §2 says
-- must never be softened quietly.

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
