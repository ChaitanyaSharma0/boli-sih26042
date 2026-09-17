import { useEffect, useState } from "react";
import { languages as fetchLanguages } from "../api";
import LanguageChip from "../components/LanguageChip";
import { capabilityBadge, groupLanguages } from "../capability";

// Screen 2 — pick the mother tongues in the room.
//
// The list and every capability claim on it come from GET /languages.
// Nothing about a language is hardcoded here (RULES.md §5), and the
// screen groups by what each language can actually do, so the boundary
// in PRD.md §4 is the structure of the page rather than a footnote.

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

  const heading = <h1 id="languages-heading">Which languages are in the room?</h1>;

  if (error) {
    return (
      <section aria-labelledby="languages-heading">
        {heading}
        <p className="error">Couldn't load the language list. {error}</p>
        <div className="actions">
          <button className="button button--secondary" onClick={onBack}>
            Back
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
        {heading}
        <p className="stage" role="status">
          Loading languages…
        </p>
      </section>
    );
  }

  const count = selectedLangs.length;

  return (
    <section aria-labelledby="languages-heading">
      {heading}
      <p className="intro">
        Pick as many as you need. What each one can do is different, and it
        says so on the card.
      </p>

      {groupLanguages(list).map((group) => (
        <div key={group.key}>
          <div className="section-head">
            <h2 className="section-label">{group.heading}</h2>
            {/* Same words as each card's badge, so the boundary reads at the
                section level before any single card does. */}
            <span className={`badge badge--${group.key}`}>
              {capabilityBadge({ translation: group.key })}
            </span>
          </div>
          {group.blurb && <p className="section-note">{group.blurb}</p>}
          <div className="chip-list">
            {group.items.map((language) => (
              <LanguageChip
                key={language.code}
                language={language}
                selected={selectedLangs.includes(language.code)}
                onToggle={(code) =>
                  setSelectedLangs(
                    selectedLangs.includes(code)
                      ? selectedLangs.filter((c) => c !== code)
                      : [...selectedLangs, code],
                  )
                }
              />
            ))}
          </div>
        </div>
      ))}

      <div className="actions">
        <button className="button button--secondary" onClick={onBack}>
          Back
        </button>
        <button
          className="button button--primary"
          onClick={onNext}
          disabled={count === 0}
        >
          {count === 0
            ? "Pick a language"
            : `Continue with ${count} language${count > 1 ? "s" : ""}`}
        </button>
      </div>
    </section>
  );
}
