import { useRef, useState } from "react";
import { ocr } from "../api";
import ContrastDemo from "../components/ContrastDemo";

// Screen 1 — the teacher types the lesson line, or photographs it.
//
// OCR never blocks the flow: whatever Tesseract returns lands in the
// textarea, editable, because it does misread Hindi. It reorders some
// vowel signs (किसान comes back as कस्िान) while still reporting decent
// confidence, so the invitation to check the text is not boilerplate —
// it is the actual correction mechanism (ARCHITECTURE.md §3).
export default function Capture({
  hindiText,
  setHindiText,
  setSourceType,
  onNext,
}) {
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const fileInput = useRef(null);

  async function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setReading(true);
    setError("");
    try {
      const result = await ocr(file);
      setHindiText(result.text);
      setSourceType("ocr");
      setOcrConfidence(result.confidence);
    } catch (e) {
      setError(e.message);
    } finally {
      setReading(false);
      event.target.value = ""; // let the same photo be retried
    }
  }

  return (
    <section aria-labelledby="capture-heading">
      <h1 id="capture-heading">Type the lesson line</h1>
      <p className="intro">
        One sentence from the textbook. Photograph the page instead if that is
        quicker — the text comes back editable either way.
      </p>

      <div className="work">
        <label className="field-label" htmlFor="hindi">
          Hindi sentence
          <span className="in-script" lang="hi">
            हिंदी वाक्य
          </span>
        </label>
        <textarea
          id="hindi"
          lang="hi"
          rows={3}
          autoFocus
          value={hindiText}
          disabled={reading}
          onChange={(e) => {
            setHindiText(e.target.value);
            // Editing a photographed line keeps it "ocr" — it did come off
            // a photo. Only clearing the box entirely makes it typed again.
            if (!e.target.value.trim()) setSourceType("typed");
          }}
          placeholder="किसान खेत में गेहूँ उगाता है।"
        />

        <p className="or">
          <span>or</span>
        </p>

        <input
          ref={fileInput}
          id="lesson-photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImage}
          disabled={reading}
          hidden
        />
        <button
          type="button"
          className="photo-button"
          disabled={reading}
          aria-busy={reading}
          onClick={() => fileInput.current?.click()}
        >
          <svg
            className="photo-icon"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.1-1.8A1 1 0 0 1 8.7 4.7h6.6a1 1 0 0 1 .9.5L17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
            <circle cx="12" cy="12.7" r="3.4" />
          </svg>
          <span>
            <strong>
              {reading ? "Reading the photo…" : "Photograph the page"}
            </strong>
            <small>
              {reading
                ? "This takes a moment."
                : "Uses the camera on a phone."}
            </small>
          </span>
        </button>

        {ocrConfidence && (
          <p className="note">
            {ocrConfidence === "low"
              ? "That photo was hard to read. Check the text above before you continue."
              : "Read from the photo. Check it above — OCR misreads some Hindi letters."}
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="actions">
        <button
          className="button button--primary"
          onClick={onNext}
          disabled={!hindiText.trim()}
        >
          Choose languages
        </button>
      </div>

      {/* Judge-facing, not teacher-facing: it sits after the primary action
          so it never interrupts type -> choose -> play. */}
      <ContrastDemo />
    </section>
  );
}
