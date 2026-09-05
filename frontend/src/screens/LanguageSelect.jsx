// Screen 2 — pick mother tongues. Chips render from the live /languages
// response; capabilities are never hardcoded here (RULES.md §5).
// Wired in PLAN.md Phase 6.
export default function LanguageSelect({ onBack, onNext }) {
  return (
    <section>
      <h2>2. Languages</h2>
      <p>Language chips from /languages — not built yet.</p>
      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>Next</button>
    </section>
  );
}
