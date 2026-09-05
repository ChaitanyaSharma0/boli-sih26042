import { useState } from "react";
import { correct } from "../api";

// One teacher correction, for one language's output.
//
// This logs a row and nothing else. No model is retrained, and the
// correction does not change what the teacher sees next (PRD.md §3), so
// the confirmation says exactly that rather than implying it was applied.
export default function CorrectionForm({ lang, original, lessonId }) {
  const [open, setOpen] = useState(false);
  const [corrected, setCorrected] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await correct({ lessonId, original, corrected: corrected.trim(), lang });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <p className="note">
        Correction saved. It is stored for later review — it does not change
        this result or retrain anything.
      </p>
    );
  }

  if (!open) {
    // Without a lesson row there is nothing for the correction to
    // reference, so the offer is not made rather than made and then
    // failed on submit.
    if (lessonId == null) return null;
    return (
      <button className="link" onClick={() => setOpen(true)}>
        Suggest a correction
      </button>
    );
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor={`correction-${lang}`}>
        What should this say instead?
      </label>
      <textarea
        id={`correction-${lang}`}
        rows={2}
        value={corrected}
        onChange={(e) => setCorrected(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={saving || !corrected.trim()}>
        {saving ? "Saving…" : "Save correction"}
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </form>
  );
}
