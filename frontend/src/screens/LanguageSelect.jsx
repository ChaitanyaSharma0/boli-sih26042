import { useEffect, useState } from "react";
import { languages as fetchLanguages } from "../api";
import LanguageChip from "../components/LanguageChip";
import { groupLanguages } from "../capability";

// Screen 2 — pick the mother tongues in the room.
//
// The list and every capability claim on it come from GET /languages.
// Nothing about a language is hardcoded here (RULES.md §5), and the
// screen groups by what each language can actually do, so the boundary
// in PRD.md §4 is visible rather than described in a footnote.

// Which visual treatment a group gets. Derived from the API's
// `translation` value, like everything else on this screen, so a new
// capability falls back to the neutral treatment rather than being
// silently styled as if it were a real model.
function groupModifier(key) {
  if (key === "full") return "language-group--ai";
  if (key === "phrase_bank") return "language-group--bank";
  return "";
}

export default function LanguageSelect({
  selectedLangs,
  setSelectedLangs,
  onBack,
  onNext,
}) {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  // Clearing state belongs to the event that caused it, not to the effect
  // — the effect only records what came back.
  function retry() {
    setList(null);
    setError("");
    setAttempt((n) => n + 1);
  }

  useEffect(() => {
    let cancelled = false;
    fetchLanguages()
      .then((rows) => {
        if (!cancelled) setList(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function toggle(code) {
    setSelectedLangs(
      selectedLangs.includes(code)
        ? selectedLangs.filter((c) => c !== code)
        : [...selectedLangs, code],
    );
  }

  const header = (
    <>
      <p className="eyebrow">Step 02 · Languages</p>
      <h1 id="languages-heading">Which voices does your class need?</h1>
    </>
  );

  if (error) {
    return (
      <section aria-labelledby="languages-heading">
        {header}
        <p className="error">Could not load the language list. {error}</p>
        <div className="actions">
          <button className="button button--secondary" onClick={onBack}>
            <span aria-hidden="true">←</span> Edit the lesson
          </button>
          <button className="button button--primary" onClick={retry}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!list) {
    return (
      <section aria-labelledby="languages-heading">
        {header}
        <p className="intro" role="status">
          Loading languages…
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="languages-heading">
      {header}
      <p className="intro">
        Pick as many as you need. What each language can actually do is
        different, and it is spelled out below.
      </p>

      {groupLanguages(list).map((group, index) => (
        <fieldset
          key={group.key}
          className={`language-group ${groupModifier(group.key)}`}
        >
          <legend>
            {String(index + 1).padStart(2, "0")} / {group.heading}
          </legend>
          {group.blurb && <p className="group-blurb">{group.blurb}</p>}
          <div className="language-grid">
            {group.items.map((language) => (
              <LanguageChip
                key={language.code}
                language={language}
                selected={selectedLangs.includes(language.code)}
                onToggle={toggle}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="actions">
        <button className="button button--secondary" onClick={onBack}>
          <span aria-hidden="true">←</span> Edit the lesson
        </button>
        <button
          className="button button--primary"
          onClick={onNext}
          disabled={selectedLangs.length === 0}
        >
          {selectedLangs.length === 0
            ? "Pick at least one language"
            : `Continue with ${selectedLangs.length} language${
                selectedLangs.length > 1 ? "s" : ""
              }`}{" "}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
