import { useRef, useState } from "react";
import { ocr, extractChapter, transcribeAudio } from "../api";
import ContrastDemo from "../components/ContrastDemo";

// Screen 1 — the teacher types the lesson line, speaks it (ASR),
// photographs a textbook page, or uploads a whole chapter PDF.
export default function Capture({
  hindiText,
  setHindiText,
  grade,
  setGrade,
  chapterSentences,
  setChapterSentences,
  setSourceType,
  onNext,
}) {
  const [reading, setReading] = useState(false);
  const [extractingChapter, setExtractingChapter] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState(null);

  const fileInput = useRef(null);
  const chapterFileInput = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  async function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setReading(true);
    setError("");
    try {
      const result = await ocr(file);
      setHindiText(result.text);
      setChapterSentences([]);
      setSourceType("ocr");
      setOcrConfidence(result.confidence);
    } catch (e) {
      setError(e.message);
    } finally {
      setReading(false);
      event.target.value = ""; // let the same photo be retried
    }
  }

  async function handleChapterUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setExtractingChapter(true);
    setError("");
    try {
      const result = await extractChapter(file);
      if (result.sentences && result.sentences.length > 0) {
        setChapterSentences(result.sentences);
        setHindiText(result.sentences.join("\n"));
        setSourceType("pdf_chapter");
      }
    } catch (e) {
      setError("Chapter extraction failed: " + e.message);
    } finally {
      setExtractingChapter(false);
      event.target.value = "";
    }
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/wav",
        });
        setTranscribing(true);
        try {
          const res = await transcribeAudio(audioBlob);
          if (res.text) {
            setHindiText((prev) => (prev ? prev + " " + res.text : res.text));
            setSourceType("asr");
          }
        } catch (err) {
          setError("Speech recognition failed: " + err.message);
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access not available: " + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
        <div style={{ marginBottom: "1rem" }}>
          <label className="field-label" htmlFor="grade-select">
            Target Grade / Class <span lang="hi">कक्षा</span>:
          </label>
          <select
            id="grade-select"
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            style={{
              display: "block",
              marginTop: "0.25rem",
              padding: "0.4rem 0.6rem",
              fontSize: "0.95rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
              maxWidth: "260px",
            }}
          >
            <option value={1}>Class 1 (Ages 5–6)</option>
            <option value={2}>Class 2 (Ages 6–7, default)</option>
            <option value={3}>Class 3 (Ages 7–8)</option>
            <option value={4}>Class 4 (Ages 8–9)</option>
            <option value={5}>Class 5 (Ages 9–10)</option>
          </select>
        </div>

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
            if (!e.target.value.trim()) {
              setSourceType("typed");
              setChapterSentences([]);
            }
          }}
          placeholder="किसान खेत में गेहूँ उगाता है।"
        />

        <div style={{ marginTop: "0.5rem" }}>
          <button
            type="button"
            className="button button--secondary"
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.9rem",
              backgroundColor: isRecording ? "#B02A20" : undefined,
              color: isRecording ? "#fff" : undefined,
            }}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={transcribing || reading || extractingChapter}
          >
            {isRecording
              ? "⏹ Stop Recording (Listening...)"
              : transcribing
              ? "⏳ Transcribing Hindi Speech…"
              : "🎤 Speak Hindi (Mic)"}
          </button>
        </div>

        <div className="divider">
          <span>or upload chapter / photo</span>
        </div>

        <div style={{ display: "grid", gap: "0.75rem" }}>
          <input
            ref={fileInput}
            id="lesson-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImage}
            disabled={reading || extractingChapter}
            hidden
          />
          <button
            type="button"
            className="photo-button"
            disabled={reading || extractingChapter}
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

          <input
            ref={chapterFileInput}
            id="lesson-chapter"
            type="file"
            accept=".pdf,.txt"
            onChange={handleChapterUpload}
            disabled={extractingChapter || reading}
            hidden
          />
          <button
            type="button"
            className="photo-button"
            disabled={extractingChapter || reading}
            onClick={() => chapterFileInput.current?.click()}
          >
            <span className="photo-icon" aria-hidden="true">
              📄
            </span>
            <span>
              <strong>
                {extractingChapter
                  ? "Extracting chapter sentences…"
                  : "Upload Chapter PDF (Whole Chapter)"}
              </strong>
              <small>Extracts every sentence for full chapter simplification & audio pack.</small>
            </span>
          </button>
        </div>

        {chapterSentences && chapterSentences.length > 0 && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "rgba(27, 107, 69, 0.08)",
              border: "1px solid #1B6B45",
              borderRadius: "4px",
            }}
          >
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>
              ✓ Extracted {chapterSentences.length} sentences from chapter:
            </p>
            <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", maxHeight: "120px", overflowY: "auto" }}>
              {chapterSentences.map((s, idx) => (
                <li key={idx} style={{ marginBottom: "0.2rem" }}>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

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
