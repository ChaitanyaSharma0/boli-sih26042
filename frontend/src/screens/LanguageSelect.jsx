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

  if (error) {
    return (
      <section>
        <h2>2. Languages</h2>
        <p className="error">Could not load the language list. {error}</p>
        <button onClick={retry}>Try again</button>
        <button onClick={onBack}>Back</button>
      </section>
    );
  }

  if (!list) {
    return (
      <section>
        <h2>2. Languages</h2>
        <p>Loading languages…</p>
      </section>
    );
  }

  return (
    <section>
      <h2>2. Languages</h2>
      <p>Which mother tongues are in the room? Pick as many as you need.</p>

      {groupLanguages(list).map((group) => (
        <div key={group.key} className="group">
          <h3>{group.heading}</h3>
          {group.blurb && <p className="group-blurb">{group.blurb}</p>}
          {group.items.map((language) => (
            <LanguageChip
              key={language.code}
              language={language}
              selected={selectedLangs.includes(language.code)}
              onToggle={toggle}
            />
          ))}
        </div>
      ))}

      <button onClick={onNext} disabled={selectedLangs.length === 0}>
        {selectedLangs.length === 0
          ? "Pick at least one language"
          : `Continue with ${selectedLangs.length} language${
              selectedLangs.length > 1 ? "s" : ""
            }`}
      </button>
      <button onClick={onBack}>Back</button>
    </section>
  );
}
