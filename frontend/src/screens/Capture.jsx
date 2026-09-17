import { useRef, useState } from "react";
import { ocr, extractChapter, transcribeAudio } from "../api";
import ContrastDemo from "../components/ContrastDemo";

// Screen 1 — the teacher types the lesson line, speaks it (ASR),
// photographs a textbook page, or uploads a whole chapter PDF.
//
// OCR never blocks the flow: whatever Tesseract returns lands in the
// textarea, editable, because it does misread Hindi. It reorders some
// vowel signs (किसान comes back as कस्िान) while still reporting decent
// confidence, so the invitation to check the text is not boilerplate —
// it is the actual correction mechanism (ARCHITECTURE.md §3).
const GRADES = [
  { value: 1, ages: "5–6" },
  { value: 2, ages: "6–7" },
  { value: 3, ages: "7–8" },
  { value: 4, ages: "8–9" },
  { value: 5, ages: "9–10" },
];

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
      <h1 id="capture-heading">Type the lesson line</h1>
      <p className="intro">
        One sentence from the textbook. Photograph the page instead if that is
        quicker — the text comes back editable either way.
      </p>

      <div className="work">
        {/* Native radios under the pills: one tap on a phone, and arrow
            keys work without any code of ours. */}
        <fieldset className="grade">
          <legend className="field-label">
            Target Grade / Class
            <span className="in-script" lang="hi">
              कक्षा
            </span>
          </legend>
          <div className="grade-pills">
            {GRADES.map((g) => (
              <label key={g.value} className="grade-pill">
                <input
                  type="radio"
                  name="grade"
                  value={g.value}
                  checked={grade === g.value}
                  onChange={() => setGrade(g.value)}
                />
                <span>{g.value}</span>
              </label>
            ))}
          </div>
          <p className="grade-hint">
            Class {grade}, ages {GRADES.find((g) => g.value === grade)?.ages}
            {grade === 2 && " (default)"}
          </p>
        </fieldset>

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
            if (!e.target.value.trim()) {
              setSourceType("typed");
              setChapterSentences([]);
            }
          }}
          placeholder="किसान खेत में गेहूँ उगाता है।"
        />

        <div className="input-tools">
          <button
            type="button"
            className={`mic-button ${isRecording ? "is-recording" : ""}`}
            aria-pressed={isRecording}
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

        <p className="or">
          <span>or upload chapter / photo</span>
        </p>

        <div className="upload-options">
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
          <div className="extracted">
            <p className="extracted-head">
              ✓ Extracted {chapterSentences.length} sentences from chapter:
            </p>
            <ol className="extracted-list" lang="hi">
              {chapterSentences.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ol>
          </div>
        )}

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
