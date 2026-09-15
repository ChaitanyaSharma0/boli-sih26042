import { useRef, useState } from "react";
import { ocr, extractChapter, transcribeAudio } from "../api";
import ContrastDemo from "../components/ContrastDemo";

export default function Capture({
  hindiText,
  setHindiText,
  grade = 2,
  setGrade,
  chapterSentences = [],
  setChapterSentences,
  setSourceType,
  onNext,
}) {
  const [activeMode, setActiveMode] = useState(
    chapterSentences && chapterSentences.length > 0 ? "chapter" : "sentence"
  );
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

  const GRADE_DESCRIPTIONS = {
    1: "Class 1: 3–4 words/sentence, simplest everyday home words.",
    2: "Class 2: ~5 words/sentence, village spoken vocabulary (recommended).",
    3: "Class 3: 6–7 words/sentence, familiar primary classroom vocabulary.",
    4: "Class 4: 7–9 words/sentence, introducing standard primary concepts.",
    5: "Class 5: 8–10 words/sentence, standard primary curriculum level.",
  };

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
      event.target.value = "";
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
      <div className="section-eyebrow">
        <span className="eyebrow-tag">STEP 01</span>
        <span>PRIMARY TEXTBOOK TO SPOKEN MOTHER TONGUE</span>
      </div>
      <h1 id="capture-heading" className="screen-title">
        Start with a Hindi primary lesson.
      </h1>
      <p className="screen-subtitle">
        Type a sentence, record classroom speech via Meta MMS ASR, or upload a textbook PDF to synthesize spoken audio in Jharkhand's tribal languages.
      </p>

      {/* Mode Selector */}
      <div className="segmented-control" role="tablist" aria-label="Input Mode">
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "sentence"}
          className={`segmented-btn ${activeMode === "sentence" ? "active" : ""}`}
          onClick={() => setActiveMode("sentence")}
        >
          <span>✍️ Single Sentence</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "chapter"}
          className={`segmented-btn ${activeMode === "chapter" ? "active" : ""}`}
          onClick={() => setActiveMode("chapter")}
        >
          <span>📚 Whole Chapter PDF</span>
        </button>
      </div>

      <div className="panel">
        {/* Grade-Level Selector */}
        <div className="grade-selector-container">
          <label className="field-label" htmlFor="grade-pills">
            <span>Target Grade Level (कक्षा)</span>
            <span style={{ color: "var(--green)", fontWeight: 600 }}>Class {grade}</span>
          </label>
          <div id="grade-pills" className="grade-pills" role="radiogroup">
            {[1, 2, 3, 4, 5].map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={grade === g}
                className={`grade-pill ${grade === g ? "active" : ""}`}
                onClick={() => setGrade(g)}
              >
                Class {g}
              </button>
            ))}
          </div>
          <span className="grade-info-tag">{GRADE_DESCRIPTIONS[grade]}</span>
        </div>

        {activeMode === "sentence" ? (
          <>
            <div className="section-title">
              <label className="field-label" htmlFor="hindi">
                <span>Hindi sentence <span lang="hi">हिंदी वाक्य</span></span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>
                  {hindiText.trim() ? `${hindiText.trim().split(/\s+/).length} words` : "Empty"}
                </span>
              </label>
            </div>

            <textarea
              id="hindi"
              lang="hi"
              rows={4}
              value={hindiText}
              onChange={(e) => {
                setHindiText(e.target.value);
                if (!e.target.value.trim()) {
                  setSourceType("typed");
                  setChapterSentences([]);
                }
              }}
              placeholder="उदाहरण: किसान खेत में धान उगाता है।"
            />

            <div className="input-toolbar">
              <button
                type="button"
                className={`mic-btn ${isRecording ? "recording" : ""}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={transcribing || reading}
              >
                {isRecording ? (
                  <span className="voice-wave-bars" aria-hidden="true">
                    <span className="bar" />
                    <span className="bar" />
                    <span className="bar" />
                    <span className="bar" />
                  </span>
                ) : (
                  <span>🎙️</span>
                )}
                <span>
                  {isRecording
                    ? "Listening Hindi… Click to stop"
                    : transcribing
                    ? "Transcribing voice…"
                    : "Speak Hindi (Meta MMS)"}
                </span>
              </button>

              <button
                type="button"
                className="mic-btn"
                onClick={() => fileInput.current?.click()}
                disabled={reading}
              >
                <span>📷</span>
                <span>{reading ? "Reading photo…" : "Upload textbook photo"}</span>
              </button>
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
          </>
        ) : (
          <>
            <div className="chapter-upload-section">
              <input
                ref={chapterFileInput}
                id="lesson-chapter"
                type="file"
                accept=".pdf,.txt"
                onChange={handleChapterUpload}
                disabled={extractingChapter}
                hidden
              />
              <button
                type="button"
                className="upload-card-btn"
                onClick={() => chapterFileInput.current?.click()}
                disabled={extractingChapter}
              >
                <div className="upload-icon">📄</div>
                <div>
                  <strong>
                    {extractingChapter
                      ? "Extracting chapter sentences…"
                      : "Upload Textbook Chapter (.PDF or .TXT)"}
                  </strong>
                  <small>
                    Automatically parses each sentence for batch simplification, translation, and audio.
                  </small>
                </div>
              </button>

              {chapterSentences && chapterSentences.length > 0 && (
                <div className="extracted-box">
                  <div className="extracted-box-header">
                    <span>✓ Extracted {chapterSentences.length} Chapter Sentences</span>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "var(--green-dark)", cursor: "pointer", textDecoration: "underline", fontSize: "0.8rem" }}
                      onClick={() => setChapterSentences([])}
                    >
                      Clear
                    </button>
                  </div>
                  <ol className="extracted-list" lang="hi">
                    {chapterSentences.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </>
        )}

        {ocrConfidence && (
          <p className="note">
            {ocrConfidence === "low"
              ? "That photo was hard to read. Check the text above carefully before continuing."
              : "Text read from photo. Check it above — OCR can misread Hindi letters."}
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

      <div className="platform-trust-footer">
        <div className="trust-left">
          <span className="trust-icon">🏛️</span>
          <div>
            <strong>Smart Education · SIH26042</strong>
            <span>Government of Jharkhand · Primary School Mother-Tongue Learning</span>
          </div>
        </div>
        <div className="trust-contact-links">
          <a className="trust-link" href="mailto:support@jepc.jharkhand.gov.in" title="Teacher Support Email">
            ✉️ Teacher Support
          </a>
        </div>
      </div>
    </section>
  );
}
