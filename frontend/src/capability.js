// Every claim the UI makes about what a language can do lives here.
//
// It is kept in one plain module, out of the components, for the same
// reason the pedagogy prompt lives in one file (RULES.md §3): this is the
// wording of PRD.md §4's boundary, and it should take one diff in one
// place to change, and be testable without a browser.
//
// Nothing here may key off a language code. Everything is derived from
// the `translation` and `tts` fields of GET /languages, so if the backend
// changes what a language can do, this text follows without an edit
// (RULES.md §5).

// A teacher-readable sentence for every combination the API can return,
// including ones no language currently has. An unhandled pair would
// render as blank space, and blank space reads as "no limitations".
export function describeCapability({ translation, tts }) {
  if (translation === "full" && tts === "full") {
    return "AI translation, with a voice.";
  }
  if (translation === "full") {
    return "Real AI translation. Text only — there is no voice for this language.";
  }
  if (translation === "phrase_bank" && tts === "full") {
    return "A voice, speaking from a short checked phrase list. This is not live translation.";
  }
  if (translation === "phrase_bank") {
    return "A short checked phrase list. Text only, and not live translation.";
  }
  return "Not available yet.";
}

export function capabilityBadge({ translation }) {
  if (translation === "full") return "AI translation";
  if (translation === "phrase_bank") return "Phrase bank only";
  return "Unavailable";
}

// Group headings, keyed by the API's `translation` value.
export const GROUPS = [
  {
    key: "full",
    heading: "Real translation",
    blurb: "The lesson is translated by an AI model trained on this language.",
  },
  {
    key: "phrase_bank",
    heading: "Curated phrase bank",
    blurb:
      "No translation model exists for these languages — not ours, not anyone's. " +
      "BOLI speaks a small hand-built list of phrases instead. None of these " +
      "phrases has been checked by a native speaker yet: pending validation.",
  },
];

// Groups render in GROUPS order. A `translation` value not listed above
// still gets its own group rather than vanishing — a language silently
// missing from this screen is the one failure mode that would let the
// teacher assume a capability nobody claimed.
export function groupLanguages(list) {
  const known = GROUPS.map((g) => g.key);
  const extras = [...new Set(list.map((l) => l.translation))]
    .filter((key) => !known.includes(key))
    .map((key) => ({ key, heading: key, blurb: "" }));

  return [...GROUPS, ...extras]
    .map((group) => ({
      ...group,
      items: list.filter((l) => l.translation === group.key),
    }))
    .filter((group) => group.items.length > 0);
}

// IndicTrans2 target codes are script-qualified (sat_Olck) while
// /languages returns plain ISO codes (sat) and does not carry the target.
// Until the endpoint does, the mapping lives here — flagged in STATE.md.
const TRANSLATE_TARGETS = { sat: "sat_Olck" };

// The translate target for a language, or null if it must never be sent
// to /translate.
//
// This is the frontend half of PRD.md §4's boundary. A phrase-bank
// language returns null unconditionally and before any lookup, so there
// is no path — not a typo, not a new entry in the map above, not a
// backend change — by which Ho, Mundari, Kurukh or Sadri reach the
// translation endpoint. The backend also refuses them with a 501; this
// is the belt to that pair of braces, and the reason the request is
// never made in the first place.
export function translateTargetFor(language) {
  if (language.translation !== "full") return null;
  return TRANSLATE_TARGETS[language.code] ?? null;
}
