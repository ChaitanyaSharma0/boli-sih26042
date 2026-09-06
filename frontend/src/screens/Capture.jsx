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
      <p className="eyebrow">Step 01 · Capture</p>
      <h1 id="capture-heading">Start with a Hindi lesson.</h1>
      <p className="intro">
        Type a sentence from the textbook, or photograph the page. You can
        check and fix the text before continuing.
      </p>

      <div className="panel">
        <div className="section-title">
          <label className="field-label" htmlFor="hindi">
            Hindi sentence <span lang="hi">हिंदी वाक्य</span>
          </label>
        </div>

        <textarea
          id="hindi"
          lang="hi"
          rows={4}
          value={hindiText}
          onChange={(e) => {
            setHindiText(e.target.value);
            // Editing a photographed line keeps it "ocr" — it did come off
            // a photo. Only clearing the box entirely makes it typed again.
            if (!e.target.value.trim()) setSourceType("typed");
          }}
          placeholder="किसान खेत में गेहूँ उगाता है।"
        />

        <div className="divider">
          <span>or use a photo</span>
        </div>

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
          onClick={() => fileInput.current?.click()}
        >
          <span className="photo-icon" aria-hidden="true">
            ▣
          </span>
          <span>
            <strong>
              {reading ? "Reading the photo…" : "Photograph or upload a page"}
            </strong>
            <small>The text comes back editable — check it before continuing.</small>
          </span>
        </button>

        {ocrConfidence && (
          <p className="note">
            {ocrConfidence === "low"
              ? "That photo was hard to read. Check the text above carefully before continuing."
              : "Text read from the photo. Check it above — OCR can misread Hindi letters."}
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="actions actions--end">
        <button
          className="button button--primary"
          onClick={onNext}
          disabled={!hindiText.trim()}
        >
          Choose languages <span aria-hidden="true">→</span>
        </button>
      </div>

      <ContrastDemo />
    </section>
  );
}
