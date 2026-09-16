import { useState, useRef } from "react";
import { transcribeAudio, simplify, translate, speak } from "../api";
import AudioPlayer from "./AudioPlayer";

export default function LiveClassroom({ onLoadIntoStudio, currentGrade = 2 }) {
  const [inputText, setInputText] = useState("");
  const [selectedLang, setSelectedLang] = useState("sat"); // "sat" | "hoc" | "unr" | "kru" | "sck"
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  // Real measured latency (never faked)
  const [measuredLatencySec, setMeasuredLatencySec] = useState(null);

  // Results
  const [liveResult, setLiveResult] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const CLASSROOM_PROMPTS = [
    { label: "जल जीवन", text: "पानी हमारा जीवन है" },
    { label: "किताब खोलो", text: "सब बच्चे अपनी किताब खोलो" },
    { label: "कहानी समय", text: "आज हम जंगल की कहानी सुनेंगे" },
    { label: "शाबाश", text: "शाबाश बच्चों, बहुत अच्छा किया!" },
    { label: "पेड़ बचाओ", text: "हमें जंगल के पेड़ों को बचाना है" },
  ];

  const DIALECTS = [
    { code: "sat", name: "Santali (Ol Chiki ᱥᱟᱱᱛᱟᱲᱤ)", type: "ai", badge: "AI Translation + Voice" },
    { code: "hoc", name: "Ho (ᱦᱳ ᱡᱟᱜᱟᱨ)", type: "bank", badge: "Curated Phrase Bank Voice" },
    { code: "unr", name: "Mundari (मुंडारी)", type: "bank", badge: "Curated Phrase Bank Voice" },
    { code: "kru", name: "Kurukh (कुड़ुख़)", type: "bank", badge: "Curated Phrase Bank Voice" },
    { code: "sck", name: "Sadri (नागपुरी)", type: "bank", badge: "Curated Phrase Bank Voice" },
  ];

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
        setStatusMessage("Transcribing teacher speech via MMS ASR…");
        setIsProcessing(true);
        try {
          const res = await transcribeAudio(audioBlob);
          if (res.text) {
            setInputText(res.text);
            await processTeacherSentence(res.text, selectedLang);
          }
        } catch (err) {
          setError("Speech recognition failed: " + err.message);
        } finally {
          setIsProcessing(false);
          setStatusMessage("");
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

  async function processTeacherSentence(textToProcess, langCode) {
    const query = (textToProcess || inputText).trim();
    if (!query) return;

    setIsProcessing(true);
    setError("");
    setLiveResult(null);
    setMeasuredLatencySec(null);

    const startTime = performance.now();

    try {
      if (langCode === "sat") {
        // Santali has real AI pipeline
        setStatusMessage(`1/3: Adapting for Class ${currentGrade}…`);
        const sim = await simplify(query, currentGrade);

        setStatusMessage("2/3: Translating into Santali Ol Chiki…");
        const adaptedSentence = sim.adapted_hindi[0] || query;
        const trans = await translate(adaptedSentence, "sat_Olck");

        setStatusMessage("3/3: Synthesizing Indic Parler-TTS voice…");
        const audioRes = await speak(trans.translated, "sat");

        const endTime = performance.now();
        const durationSec = ((endTime - startTime) / 1000).toFixed(2);
        setMeasuredLatencySec(durationSec);

        setLiveResult({
          originalHindi: query,
          simplifiedHindi: adaptedSentence,
          concept: sim.concept,
          targetScript: trans.translated,
          isContaminated: trans.script_contamination,
          audioBlob: audioRes.kind === "audio" ? audioRes.blob : null,
          langName: "Santali (Ol Chiki)",
          langCode: "sat",
        });
      } else {
        // Ho, Mundari, Kurukh, Sadri use curated phrase bank
        setStatusMessage(`Querying curated classroom phrase bank & MMS-TTS…`);
        const audioRes = await speak(query, langCode);

        const endTime = performance.now();
        const durationSec = ((endTime - startTime) / 1000).toFixed(2);
        setMeasuredLatencySec(durationSec);

        if (audioRes.kind === "audio") {
          const dialectMeta = DIALECTS.find((d) => d.code === langCode);
          setLiveResult({
            originalHindi: query,
            targetScript: audioRes.targetText || query,
            audioBlob: audioRes.blob,
            langName: dialectMeta?.name || langCode,
            langCode,
            isBank: true,
          });
        } else if (audioRes.kind === "phrase_bank_only") {
          setError(
            `${audioRes.reason} (BOLI phrase bank contains: "${audioRes.options.map((o) => o.hindi_source).join('", "')}")`
          );
        }
      }
    } catch (err) {
      setError("Processing failed: " + err.message);
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  }

  return (
    <section className="live-classroom-section" aria-labelledby="live-heading">
      <div className="section-eyebrow">
        <span className="eyebrow-tag">कक्षा १–५ त्वरित संवाद</span>
        <span>शिक्षक मौखिक सहायक · लाइव कक्षा उच्चारण (Live Classroom Mode)</span>
      </div>
      <h1 id="live-heading" className="screen-title">
        Live Classroom Vernacular Assistant <span lang="hi">(लाइव कक्षा शिक्षण)</span>
      </h1>
      <p className="screen-subtitle">
        Speak a Hindi instruction aloud. BOLI instantly adapts, translates to the child's mother tongue, and plays authentic village-accurate audio over classroom speakers.
      </p>

      {/* Dialect Selector Bar */}
      <div className="live-lang-picker sun-card-shadow">
        <span className="picker-label">Target Classroom Tongue:</span>
        <div className="picker-buttons">
          {DIALECTS.map((d) => (
            <button
              key={d.code}
              type="button"
              className={`live-lang-btn ${selectedLang === d.code ? "active" : ""}`}
              onClick={() => {
                setSelectedLang(d.code);
                if (liveResult) {
                  processTeacherSentence(inputText, d.code);
                }
              }}
            >
              <span className="lang-btn-name">{d.name}</span>
              <span className={`lang-btn-tag tag-${d.type}`}>{d.type === "ai" ? "AI Neural" : "Phrase Bank"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Classroom Control Console */}
      <div className="panel sun-card-shadow live-console-panel">
        <div className="live-mic-hero">
          <button
            type="button"
            className={`live-giant-mic-btn ${isRecording ? "recording-pulse" : ""}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            aria-label={isRecording ? "Stop dictation" : "Click to speak Hindi instruction aloud"}
            title="Click to speak Hindi instruction aloud"
          >
            <span className="material-symbols-outlined mic-giant-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
              mic
            </span>
          </button>

          <div className="mic-hero-text">
            <h2>{isRecording ? "Listening to teacher… (Click when done)" : "Tap Microphone & Speak Hindi"}</h2>
            <p className="text-secondary text-sm">
              {isRecording
                ? "Speak clearly into your laptop or phone microphone in Hindi."
                : "Or type a classroom phrase below. Instant transformation to mother tongue."}
            </p>
          </div>
        </div>

        {/* Input Text Box */}
        <div className="live-input-box">
          <input
            type="text"
            className="live-text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                processTeacherSentence(inputText, selectedLang);
              }
            }}
            placeholder="यहाँ हिंदी वाक्य लिखें या बोलें... (उदा: पानी हमारा जीवन है)"
            lang="hi"
          />
          <button
            type="button"
            className="button button--primary tactile-btn-primary"
            onClick={() => processTeacherSentence(inputText, selectedLang)}
            disabled={isProcessing || !inputText.trim()}
          >
            <span>{isProcessing ? "Processing…" : "बोलकर सुनाएं (Speak)"}</span>
            <span className="material-symbols-outlined text-base">record_voice_over</span>
          </button>
        </div>

        {/* Quick Classroom Drill Presets */}
        <div className="quick-drill-presets">
          <span className="preset-title">त्वरित कक्षा निर्देश (Quick Presets):</span>
          <div className="preset-pill-list">
            {CLASSROOM_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-chip-btn"
                onClick={() => {
                  setInputText(p.text);
                  processTeacherSentence(p.text, selectedLang);
                }}
              >
                {p.label}: "{p.text}"
              </button>
            ))}
          </div>
        </div>

        {/* Live Processing Status */}
        {isProcessing && (
          <div className="live-status-alert" role="status">
            <span className="spinner" aria-hidden="true" />
            <span>{statusMessage || "Processing classroom instruction…"}</span>
          </div>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        {/* Live Result Screen for Kids in Back Row */}
        {liveResult && (
          <div className="live-output-card">
            <div className="output-card-header">
              <div className="output-meta">
                <span className="lang-badge">{liveResult.langName}</span>
                <span className="pedagogy-badge">Class {currentGrade} Pacing</span>
              </div>
              {measuredLatencySec && (
                <span className="latency-pill" title="Actual end-to-end API execution time">
                  <span className="material-symbols-outlined text-xs">timer</span>
                  <span>Measured Latency: <strong>{measuredLatencySec}s</strong></span>
                </span>
              )}
            </div>

            {/* Giant Native Script for High Visibility */}
            <div className="giant-native-display" lang={liveResult.langCode}>
              {liveResult.targetScript}
            </div>

            {liveResult.simplifiedHindi && (
              <div className="simplified-subtext" lang="hi">
                <span>आसान हिंदी: </span>
                <strong>{liveResult.simplifiedHindi}</strong>
              </div>
            )}

            {/* Audio Player */}
            {liveResult.audioBlob && (
              <div className="live-audio-wrap">
                <AudioPlayer blob={liveResult.audioBlob} label={`${liveResult.langName} Spoken Audio`} />
              </div>
            )}

            {/* Classroom Chanting Guide */}
            <div className="classroom-chant-banner">
              <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                groups
              </span>
              <div>
                <strong>कक्षा अभ्यास (Chant Together!):</strong>
                <p>शिक्षक एक बार ऑडियो बजाएं, फिर सभी बच्चे एक साथ तीन बार दोहराएं।</p>
              </div>
            </div>

            {/* Bridge to Studio */}
            {onLoadIntoStudio && (
              <div className="live-footer-actions">
                <button
                  type="button"
                  className="button button--secondary tactile-btn-secondary"
                  onClick={() => onLoadIntoStudio(liveResult.originalHindi)}
                >
                  <span className="material-symbols-outlined text-sm">auto_stories</span>
                  <span>Open in Full Lesson Studio</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
