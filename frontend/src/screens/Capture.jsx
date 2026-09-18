import { useRef, useState } from "react";
import { ocr, extractChapter, transcribeAudio } from "../api";
import ContrastDemo from "../components/ContrastDemo";
import TextLoop from "../components/motion/TextLoop";
import Spotlight from "../components/motion/Spotlight";
import Tilt from "../components/motion/Tilt";
import BoliMascot from "../components/BoliMascot";

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
            // Dictation edits the lesson text, so it ends chapter mode —
            // otherwise the chapter's old sentence list would be processed
            // and the dictated words silently ignored.
            setChapterSentences([]);
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

  const SAMPLE_LESSONS = [
    // Sample lines written for trying BOLI out — not quoted from a named
    // textbook, so they are not labelled as if they were.
    { id: "custom", label: "Try a sample lesson…", text: "", grade: 2 },
    {
      id: "butterfly",
      label: "Class 2 sample: तितली और कली (कविता)",
      text: "हरी डाल पर लगी हुई थी नन्ही सुंदर एक कली। तितली उससे आकर बोली तुम लगती हो बड़ी भली।",
      grade: 2,
    },
    {
      id: "rabbit",
      label: "Class 1 sample: नटखट खरगोश और गाजर",
      text: "आज कक्षा में सब बच्चे बहुत खुश हैं। नन्हे खरगोश ने मीठे गाजर का हलवा अपनी माँ के साथ मिलकर बनाया। जंगल के सारे दोस्त मिलकर दावत खाएंगे।",
      grade: 1,
    },
    {
      id: "water",
      label: "Class 3 sample: जल ही जीवन है (पर्यावरण)",
      text: "जल ही हमारा जीवन है। कुएं और चापाकल का पानी हमेशा साफ रखना चाहिए। हमें मिलकर पानी बचाना है।",
      grade: 3,
    },
    {
      id: "folk",
      label: "Class 4 sample: सरहुल का पर्व",
      text: "सरहुल के पावन पर्व पर सखुआ के पेड़ों पर नए फूल खिलते हैं। गाँव के सभी बच्चे और बड़े मांदर की थाप पर मिलकर नाचते हैं।",
      grade: 4,
    },
  ];

  // Word counts are the targets the simplifier is actually given
  // (backend/models/pedagogy.py GRADE_GUIDANCE) — aims, not guarantees;
  // the result screen reports the measured words per sentence.
  const GRADE_PEDAGOGY_NOTES = {
    1: "Class 1 (ages 5–6): the simplest everyday home words, aiming for 3–4 words per sentence.",
    2: "Class 2 (ages 6–7): everyday spoken words a village child already knows, aiming for about 5 words per sentence.",
    3: "Class 3 (ages 7–8): familiar primary vocabulary, aiming for 6–7 words per sentence.",
    4: "Class 4 (ages 8–9): standard primary textbook words with local grounding, aiming for 7–9 words per sentence.",
    5: "Class 5 (ages 9–10): textbook ideas connected to local context, aiming for 8–10 words per sentence.",
  };

  function handlePresetChange(e) {
    const selected = SAMPLE_LESSONS.find((item) => item.id === e.target.value);
    if (selected && selected.text) {
      setHindiText(selected.text);
      setGrade(selected.grade);
      setSourceType("typed");
      setChapterSentences([]);
    }
  }

  // Clearing a chapter clears its text too; leaving the joined chapter in
  // the box would send the whole chapter on as one "sentence".
  function clearChapter() {
    setChapterSentences([]);
    setHindiText("");
    setSourceType("typed");
  }

  const wordCount = hindiText.trim() ? hindiText.trim().split(/\s+/).length : 0;
  const charCount = hindiText.length;
  // Time for the teacher to read the Hindi aloud (~0.7s a word) — not the
  // length of any generated audio, which depends on the language chosen.
  const readAloudSec = Math.max(2, Math.round(wordCount * 0.7));

  return (
    <section aria-labelledby="capture-heading">
      {/* Cheerful Primary School Mascot & Greeting for Kids */}
      <BoliMascot currentGrade={grade} />

      <div className="section-eyebrow">
        <span className="eyebrow-tag">कक्षा 1–5 विशेष</span>
        <span>मातृभाषा शिक्षण · झारखण्ड के प्राथमिक विद्यालयों के लिए</span>
      </div>
      <h1 id="capture-heading" className="screen-title">
        Hindi lessons for children who speak{" "}
        <TextLoop
          items={[
            "Santali (ᱥᱟᱱᱛᱟᱲᱤ)",
            "Ho (हो)",
            "Mundari (मुंडारी)",
            "Kurukh (कुड़ुख़)",
            "Sadri (नागपुरी)",
          ]}
        />
      </h1>
      <p className="screen-subtitle">
        Bridge early classroom comprehension for tribal children in Jharkhand. Adapt Hindi curriculum lessons for Class 1–5 understanding, translate into Santali, and play curated phrase-bank audio in Ho, Mundari, Kurukh and Sadri.
      </p>

      {/* Visual Pedagogy Pipeline Indicator */}
      <div className="pedagogy-flow-indicator" aria-label="Pedagogical Translation Pipeline">
        <div className="flow-step">
          <span className="flow-step-num">01</span>
          <div className="flow-step-meta">
            <span className="flow-step-title">Hindi Lesson</span>
            <span className="flow-step-sub">NCERT / JCERT Text</span>
          </div>
        </div>
        <span className="material-symbols-outlined flow-arrow" aria-hidden="true">arrow_forward</span>
        <div className="flow-step">
          <span className="flow-step-num">02</span>
          <div className="flow-step-meta">
            <span className="flow-step-title">Grade Adaptation</span>
            <span className="flow-step-sub">FLN Class 1–5 Vocab</span>
          </div>
        </div>
        <span className="material-symbols-outlined flow-arrow" aria-hidden="true">arrow_forward</span>
        <div className="flow-step">
          <span className="flow-step-num">03</span>
          <div className="flow-step-meta">
            <span className="flow-step-title">Mother Tongue</span>
            <span className="flow-step-sub">Santali + phrase bank</span>
          </div>
        </div>
        <span className="material-symbols-outlined flow-arrow" aria-hidden="true">arrow_forward</span>
        <div className="flow-step">
          <span className="flow-step-num">04</span>
          <div className="flow-step-meta">
            <span className="flow-step-title">Native Audio</span>
            <span className="flow-step-sub">Meta MMS TTS</span>
          </div>
        </div>
      </div>

      {/* Mode Selector & Quick Textbook Loader */}
      <div className="studio-top-controls">
        <div className="segmented-control" role="tablist" aria-label="Input Mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "sentence"}
            className={`segmented-btn ${activeMode === "sentence" ? "active" : ""}`}
            onClick={() => setActiveMode("sentence")}
          >
            <span className="material-symbols-outlined text-base">edit_note</span>
            <span>Single Sentence & Story</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "chapter"}
            className={`segmented-btn ${activeMode === "chapter" ? "active" : ""}`}
            onClick={() => setActiveMode("chapter")}
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            <span>Whole Chapter PDF / Scan</span>
          </button>
        </div>

        {activeMode === "sentence" && (
          <div className="preset-selector-wrapper">
            <label className="preset-label" htmlFor="lessonPreset">
              Textbook Sample:
            </label>
            <div className="select-container">
              <select
                id="lessonPreset"
                className="preset-select"
                onChange={handlePresetChange}
                defaultValue="custom"
              >
                {SAMPLE_LESSONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined select-arrow">expand_more</span>
            </div>
          </div>
        )}
      </div>

      <div className="panel sun-card-shadow" style={{ position: "relative" }}>
        {/* Pointer Spotlight Layer */}
        <Spotlight size={360} color="rgba(254, 166, 25, 0.12)" />
        {/* Target Grade Level Selector with Pedagogy Guidance */}
        <div className="grade-selector-container">
          <div className="field-label">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
              कक्षा चुनें (Select Class Level)
            </span>
            <span style={{ color: "var(--primary)", fontWeight: 700 }}>Class {grade}</span>
          </div>
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
                <span className="grade-title">Class {g}</span>
                <span className="grade-subtitle">
                  {g === 1
                    ? "कक्षा १"
                    : g === 2
                    ? "कक्षा २"
                    : g === 3
                    ? "कक्षा ३"
                    : g === 4
                    ? "कक्षा ४"
                    : "कक्षा ५"}
                </span>
              </button>
            ))}
          </div>

          {/* Child-friendly Pedagogy Guidance Box */}
          <div className="pedagogy-note-box">
            <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              sentiment_very_satisfied
            </span>
            <p className="pedagogy-text">
              <strong>कक्षा {grade} बाल-मित्र मार्गदर्शन: </strong>
              {GRADE_PEDAGOGY_NOTES[grade]}
            </p>
          </div>
        </div>

        {activeMode === "sentence" ? (
          <>
            <div className="section-title">
              <label className="field-label" htmlFor="hindi">
                <span>Enter or Paste Hindi Textbook Content <span lang="hi">(हिंदी पाठ)</span></span>
                <div className="quick-tags-cluster">
                  {hindiText && (
                    <button
                      type="button"
                      className="quick-clear-btn"
                      onClick={clearChapter}
                      title="Clear text"
                      aria-label="Clear the lesson text"
                    >
                      <span className="material-symbols-outlined text-sm">backspace</span>
                    </button>
                  )}
                </div>
              </label>
            </div>

            <div className="textarea-container">
              <textarea
                id="hindi"
                lang="hi"
                rows={4}
                value={hindiText}
                onChange={(e) => {
                  setHindiText(e.target.value);
                  // Editing the text ends chapter mode: the teacher's edits
                  // are what should be processed, not the chapter's old
                  // sentence list. A photographed or chapter line keeps its
                  // source type; only clearing the box makes it typed again.
                  setChapterSentences([]);
                  if (!e.target.value.trim()) setSourceType("typed");
                }}
                placeholder="यहाँ हिंदी पाठ टाइप करें या बोलकर रिकॉर्ड करें... (उदाहरण: किसान खेत में धान उगाता है।)"
              />

              {/* Textarea Live Metrics Bar */}
              <div className="textarea-metrics-bar">
                <div className="metrics-group">
                  <span className="metric-item metric-words">
                    <span className="material-symbols-outlined text-sm">spellcheck</span>
                    <span>{wordCount} Words</span>
                  </span>
                  <span className="metric-separator">•</span>
                  <span className="metric-item">{charCount} Characters</span>
                  <span className="metric-separator">•</span>
                  <span className="metric-item metric-duration">
                    <span className="material-symbols-outlined text-sm">timer</span>
                    <span>≈{readAloudSec} sec to read aloud</span>
                  </span>
                </div>
                <span className="metric-badge">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                    school
                  </span>
                  Class {grade} Pacing
                </span>
              </div>
            </div>

            {/* Multimodal Recording & Ingestion Toolbar */}
            <div className="input-toolbar">
              <div className="mic-wrapper">
                <button
                  type="button"
                  className={`mic-toggle-btn ${isRecording ? "recording-pulse-halo active" : ""}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={transcribing || reading || extractingChapter}
                  title="Click to speak Hindi lesson aloud"
                  aria-label={isRecording ? "Stop dictation" : "Dictate the Hindi lesson"}
                  aria-pressed={isRecording}
                >
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    mic
                  </span>
                </button>
                <div className="mic-info">
                  <span className="mic-title">Teacher Audio Dictation</span>
                  <span className="mic-status">
                    {isRecording ? (
                      <>
                        <span className="status-dot recording" />
                        Listening to teacher… (Click to finish)
                      </>
                    ) : transcribing ? (
                      <>
                        <span className="status-dot transcribing" />
                        Transcribing voice via Meta MMS…
                      </>
                    ) : (
                      <>
                        <span className="status-dot idle" />
                        Speak Hindi lesson aloud
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="toolbar-aux-tools">
                <button
                  type="button"
                  className="aux-tool-btn"
                  onClick={() => fileInput.current?.click()}
                  disabled={reading}
                >
                  <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    photo_camera
                  </span>
                  <div className="aux-tool-text">
                    <span className="aux-tool-label">Textbook Photo</span>
                    <span className="aux-tool-sub">
                      {reading ? "Reading photo…" : "Instant OCR scan"}
                    </span>
                  </div>
                </button>

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
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="chapter-upload-section">
              <input
                ref={chapterFileInput}
                id="lesson-chapter"
                type="file"
                accept=".pdf"
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
                <div className="upload-icon">
                  <span className="material-symbols-outlined text-3xl text-primary">
                    picture_as_pdf
                  </span>
                </div>
                <div>
                  <strong>
                    {extractingChapter
                      ? "Extracting chapter sentences…"
                      : "Upload Textbook Chapter (PDF)"}
                  </strong>
                  <small>
                    Extracts Hindi sentences page-by-page from NCERT/JCERT textbook chapters for batch grade adaptation, translation, and audio generation.
                  </small>
                </div>
              </button>

              {chapterSentences && chapterSentences.length > 0 && (
                <div className="extracted-box">
                  <div className="extracted-box-header">
                    <span className="flex items-center gap-1.5 font-bold text-primary">
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                      Extracted {chapterSentences.length} Chapter Sentences
                    </span>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary)",
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                      }}
                      onClick={clearChapter}
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
          className="button button--primary tactile-btn-primary"
          onClick={onNext}
          disabled={!hindiText.trim()}
          title={!hindiText.trim() ? "Please enter Hindi lesson text to continue" : "Proceed to select tribal dialects"}
        >
          <span>Continue to Languages →</span>
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>

      <ContrastDemo />

      {/* Classroom Pedagogy Feature Bento Grid */}
      <div className="classroom-bento-grid">
        <Tilt rotationFactor={7}>
          <div className="bento-card">
            <div className="bento-icon-box bg-primary-light">
              <span className="material-symbols-outlined text-2xl text-primary">translate</span>
            </div>
            <h3 className="bento-title">Honest About Each Language</h3>
            <p className="bento-desc">
              Santali is translated into Ol Chiki as text — no voice exists for it yet. Ho, Mundari, Kurukh and Sadri play curated phrase-bank audio via Meta MMS, every phrase checked by native speakers.
            </p>
            <div className="bento-footer">
              <span className="bento-tag text-primary">5 Languages</span>
              <span className="material-symbols-outlined text-sm text-primary">translate</span>
            </div>
          </div>
        </Tilt>

        <Tilt rotationFactor={7}>
          <div className="bento-card">
            <div className="bento-icon-box bg-secondary-light">
              <span className="material-symbols-outlined text-2xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                download_for_offline
              </span>
            </div>
            <h3 className="bento-title">Offline Lesson Pack Download</h3>
            <p className="bento-desc">
              Generate self-contained HTML players and pure WAV audio files. Teachers can preload lesson plans in block resource centres and run circle drills in zero-connectivity village schools.
            </p>
            <div className="bento-footer">
              <span className="bento-tag text-secondary">HTML + WAV Bundle</span>
              <span className="material-symbols-outlined text-sm text-secondary">offline_pin</span>
            </div>
          </div>
        </Tilt>

        <Tilt rotationFactor={7}>
          <div className="bento-card">
            <div className="bento-icon-box bg-tertiary-light">
              <span className="material-symbols-outlined text-2xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
                record_voice_over
              </span>
            </div>
            <h3 className="bento-title">Interactive Choral Echo</h3>
            <p className="bento-desc">
              For Class 1–5 learners. Live Classroom listens to a teacher's Hindi phrase (MMS ASR), plays the matching phrase-bank audio when there is one, and guides choral chant-and-repeat drills.
            </p>
            <div className="bento-footer">
              <span className="bento-tag text-tertiary">Choral Repetition</span>
              <span className="material-symbols-outlined text-sm text-tertiary">graphic_eq</span>
            </div>
          </div>
        </Tilt>
      </div>


    </section>
  );
}
