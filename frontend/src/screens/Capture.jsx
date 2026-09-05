import { useState } from "react";
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
    <section>
      <h2>1. The lesson</h2>
      <label htmlFor="hindi">Hindi sentence from the textbook</label>
      <textarea
        id="hindi"
        rows={4}
        value={hindiText}
        onChange={(e) => {
          setHindiText(e.target.value);
          // Editing a photographed line keeps it "ocr" — it did come off a
          // photo. Only clearing the box entirely makes it typed again.
          if (!e.target.value.trim()) setSourceType("typed");
        }}
        placeholder="किसान खेत में गेहूँ उगाता है।"
      />

      <label className="file">
        {reading ? "Reading the photo…" : "or photograph the page"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImage}
          disabled={reading}
        />
      </label>

      {ocrConfidence && (
        <p className="note">
          {ocrConfidence === "low"
            ? "That photo was hard to read. Check the text above carefully before continuing."
            : "Text read from the photo. Check it above — OCR can misread Hindi letters."}
        </p>
      )}
      {error && <p className="error">{error}</p>}

      <button onClick={onNext} disabled={!hindiText.trim()}>
        Choose languages
      </button>

      <ContrastDemo />
    </section>
  );
}
