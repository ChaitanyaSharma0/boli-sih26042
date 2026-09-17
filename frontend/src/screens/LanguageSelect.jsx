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
      <div className="section-eyebrow">
        <span className="eyebrow-tag">STEP 02</span>
        <span>MOTHER TONGUE SELECTION</span>
      </div>
      <h1 id="languages-heading" className="screen-title">Which voices does your class need?</h1>
    </>
  );

  if (error) {
    return (
      <section aria-labelledby="languages-heading">
        {header}
        <p className="error">Could not load the language list. {error}</p>
        <div className="actions">
          <button className="button button--secondary tactile-btn-secondary" onClick={onBack}>
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Edit the lesson</span>
          </button>
          <button className="button button--primary tactile-btn-primary" onClick={retry}>
            <span>Try again</span>
          </button>
        </div>
      </section>
    );
  }

  if (!list) {
    return (
      <section aria-labelledby="languages-heading">
        {header}
        <p className="screen-subtitle" role="status">
          Loading languages…
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="languages-heading" className="language-select-screen">
      <div className="screen-header-block">
        {header}
        <p className="screen-subtitle">
          Pick as many as you need. What each language can actually do is
          different, and it is spelled out below.
        </p>
      </div>

      {groupLanguages(list).map((group, index) => (
        <div
          key={group.key}
          className={`language-group-panel panel sun-card-shadow ${groupModifier(group.key)}`}
        >
          <div className="language-group-header">
            <div className="group-header-left">
              <span className="group-num-badge">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="group-heading">{group.heading}</h2>
                {group.blurb && <p className="group-blurb">{group.blurb}</p>}
              </div>
            </div>
            <span
              className={`group-type-tag ${
                group.key === "full"
                  ? "group-type-tag--ai"
                  : "group-type-tag--bank"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "14px" }}
              >
                {group.key === "full" ? "translate" : "menu_book"}
              </span>
              <span>
                {group.key === "full"
                  ? "Multi-Engine Translation & Speech"
                  : "Validated Audio Phrase Bank"}
              </span>
            </span>
          </div>

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
        </div>
      ))}

      <div className="actions actions--split panel-actions-bar">
        <button
          className="button button--secondary tactile-btn-secondary"
          onClick={onBack}
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Edit the lesson</span>
        </button>
        <button
          className="button button--primary tactile-btn-primary"
          onClick={onNext}
          disabled={selectedLangs.length === 0}
        >
          <span>
            {selectedLangs.length === 0
              ? "Pick at least one language"
              : `Continue with ${selectedLangs.length} language${
                  selectedLangs.length > 1 ? "s" : ""
                }`}
          </span>
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </section>
  );
}

