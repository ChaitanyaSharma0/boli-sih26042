// Screen 1 — teacher types or photographs a Hindi lesson sentence.
// Wired to /ocr in PLAN.md Phase 5.
export default function Capture({ onNext }) {
  return (
    <section>
      <h2>1. Lesson text</h2>
      <p>Hindi input (typed or photographed) — not built yet.</p>
      <button onClick={onNext}>Next</button>
    </section>
  );
}
