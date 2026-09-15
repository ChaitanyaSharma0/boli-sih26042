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

  const SAMPLE_LESSONS = [
    { id: "custom", label: "Select NCERT / JCERT Lesson Preset…", text: "", grade: 2 },
    {
      id: "butterfly",
      label: "Rimjhim Class 2: तितली और कली (कविता)",
      text: "हरी डाल पर लगी हुई थी नन्ही सुंदर एक कली। तितली उससे आकर बोली तुम लगती हो बड़ी भली।",
      grade: 2,
    },
    {
      id: "rabbit",
      label: "Jharkhand Balvatika: नटखट खरगोश और गाजर",
      text: "आज कक्षा में सब बच्चे बहुत खुश हैं। नन्हे खरगोश ने मीठे गाजर का हलवा अपनी माँ के साथ मिलकर बनाया। जंगल के सारे दोस्त मिलकर दावत खाएंगे।",
      grade: 1,
    },
    {
      id: "water",
      label: "Parivesh Class 3: जल ही जीवन है (पर्यावरण)",
      text: "जल ही हमारा जीवन है। कुएं और चापाकल का पानी हमेशा साफ रखना चाहिए। हमें मिलकर पानी बचाना है।",
      grade: 3,
    },
    {
      id: "folk",
      label: "Mundari / Santhali Folk: करम परब और सरहुल",
      text: "सरहुल के पावन पर्व पर सखुआ के पेड़ों पर नए फूल खिलते हैं। गाँव के सभी बच्चे और बड़े मांदर की थाप पर मिलकर नाचते हैं।",
      grade: 4,
    },
  ];

  const GRADE_PEDAGOGY_NOTES = {
    1: "Balvatika (Class 1): 3–5 words per clause. Extended 25% pauses between words to support emergent phonemic awareness.",
    2: "Class 2 (Early Reader): 6–10 words per phrase. Pronunciation pauses are extended by 15% to support mapping Devanagari Hindi to spoken Santali/Mundari phonemes.",
    3: "Class 3 (Fluency Building): 10–14 words per phrase. Natural rhythm with village idioms and daily conversation vocabulary.",
    4: "Class 4 (Compound Stories): Multi-clause narrative sentences with cultural substitutions for textbook Hindi terms.",
    5: "Class 5 (Upper Primary Prep): Standard curriculum vocabulary with dual-script phonetic annotations for bilingual confidence.",
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

  function insertTag(tag) {
    setHindiText((prev) => (prev ? prev.trim() + " " + tag + " " : tag + " "));
  }

  const wordCount = hindiText.trim() ? hindiText.trim().split(/\s+/).length : 0;
  const charCount = hindiText.length;
  const approxDurationSec = Math.max(2, Math.round(wordCount * 0.7));

  return (
    <section aria-labelledby="capture-heading">
      {/* Top Pedagogical Chips */}
      <div className="classroom-chips-row">
        <span className="classroom-chip chip-jcert">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            menu_book
          </span>
          JCERT / NCERT Aligned
        </span>
        <span className="classroom-chip chip-engine">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            mic
          </span>
          Tribal Phonetic Engine v2.4
        </span>
        <span className="classroom-chip chip-offline">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            wifi_off
          </span>
          100% Offline Classroom Mode
        </span>
      </div>

      <div className="section-eyebrow">
        <span className="eyebrow-tag">STEP 01</span>
        <span>PRIMARY TEXTBOOK TO SPOKEN MOTHER TONGUE</span>
      </div>
      <h1 id="capture-heading" className="screen-title">
        Start with a Hindi primary lesson.
      </h1>
      <p className="screen-subtitle">
        Bridge early classroom comprehension for tribal children in Jharkhand. Transform textbook lessons into spoken mother-tongue audio with authentic village phonetics.
      </p>

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

      <div className="panel sun-card-shadow">
        {/* Target Grade Level Selector with Pedagogy Guidance */}
        <div className="grade-selector-container">
          <div className="field-label">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
              Target Classroom Level & Articulation Speed
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
                    ? "Balvatika"
                    : g === 2
                    ? "Early Reader"
                    : g === 3
                    ? "Fluency"
                    : g === 4
                    ? "Compound"
                    : "Prep"}
                </span>
              </button>
            ))}
          </div>

          {/* Stitch Amber Pedagogy Feedback Box */}
          <div className="pedagogy-note-box">
            <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              lightbulb
            </span>
            <p className="pedagogy-text">
              <strong>Class {grade} Pedagogy Note: </strong>
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
                  <span className="quick-tag-prompt">त्वरित जोड़ें:</span>
                  <button type="button" className="quick-tag-btn" onClick={() => insertTag("[कहानी: जंगल कथा]")}>+ [कहानी]</button>
                  <button type="button" className="quick-tag-btn" onClick={() => insertTag("[पहेली]")}>+ [पहेली]</button>
                  <button type="button" className="quick-tag-btn" onClick={() => insertTag("[शिक्षक निर्देश]")}>+ [निर्देश]</button>
                  {hindiText && (
                    <button
                      type="button"
                      className="quick-clear-btn"
                      onClick={() => setHindiText("")}
                      title="Clear text"
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
                  if (!e.target.value.trim()) {
                    setSourceType("typed");
                    setChapterSentences([]);
                  }
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
                    <span>Approx {approxDurationSec} sec audio</span>
                  </span>
                </div>
                <span className="metric-badge">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
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
                  disabled={transcribing || reading}
                  title="Click to speak Hindi lesson aloud"
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
                <div className="upload-icon">
                  <span className="material-symbols-outlined text-3xl text-primary">
                    picture_as_pdf
                  </span>
                </div>
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
          className="button button--primary tactile-btn-primary"
          onClick={onNext}
          disabled={!hindiText.trim()}
        >
          <span>Choose languages (Step 2)</span>
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>

      <ContrastDemo />

      {/* Classroom Pedagogy Feature Bento Grid */}
      <div className="classroom-bento-grid">
        <div className="bento-card">
          <div className="bento-icon-box bg-primary-light">
            <span className="material-symbols-outlined text-2xl text-primary">translate</span>
          </div>
          <h3 className="bento-title">Authentic Tribal Phonetics</h3>
          <p className="bento-desc">
            Preserves authentic glottal stops and pitch in Santhali (Ol Chiki), Ho (Warang Chiti), Kudukh, Mundari, Khortha, and Sadri/Nagpuri.
          </p>
          <div className="bento-footer">
            <span className="bento-tag text-primary">6 Mother Tongues</span>
            <span className="material-symbols-outlined text-sm text-primary">verified</span>
          </div>
        </div>

        <div className="bento-card">
          <div className="bento-icon-box bg-secondary-light">
            <span className="material-symbols-outlined text-2xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              speaker_group
            </span>
          </div>
          <h3 className="bento-title">Offline Classroom Speaker Sync</h3>
          <p className="bento-desc">
            Zero internet required. Broadcast high-volume synthesized tribal audio directly to portable Bluetooth classroom megaphones during circle drills.
          </p>
          <div className="bento-footer">
            <span className="bento-tag text-secondary">Offline Cache Ready</span>
            <span className="material-symbols-outlined text-sm text-secondary">bluetooth</span>
          </div>
        </div>

        <div className="bento-card">
          <div className="bento-icon-box bg-tertiary-light">
            <span className="material-symbols-outlined text-2xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
              record_voice_over
            </span>
          </div>
          <h3 className="bento-title">Interactive Classroom Echo</h3>
          <p className="bento-desc">
            Spaced repetition designed for 6–8 year olds. The engine speaks a phrase in Mundari or Santhali, prompts students to chant, and reinforces bilingual vocabulary.
          </p>
          <div className="bento-footer">
            <span className="bento-tag text-tertiary">Chant & Repeat Logic</span>
            <span className="material-symbols-outlined text-sm text-tertiary">graphic_eq</span>
          </div>
        </div>
      </div>

      {/* Platform Trust & Support Footer */}
      <div className="platform-trust-footer">
        <div className="trust-left">
          <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            school
          </span>
          <div>
            <strong>Smart Education · SIH26042</strong>
            <span>Government of Jharkhand · Primary School Mother-Tongue Learning Pilot</span>
          </div>
        </div>
        <div className="trust-contact-links">
          <a className="trust-link" href="mailto:support@jepc.jharkhand.gov.in" title="Teacher Support Email">
            <span className="material-symbols-outlined text-base">mail</span>
            <span>Teacher Support</span>
          </a>
        </div>
      </div>
    </section>
  );
}
