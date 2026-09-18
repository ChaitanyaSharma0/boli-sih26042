import { useEffect, useRef, useState } from "react";
import { languages as fetchLanguages, speak, transcribeAudio, translate } from "../api";
import {
  capabilityBadge,
  nativeName,
  phraseBankNote,
  translateTargetFor,
} from "../capability";
import AudioPlayer from "./AudioPlayer";

// Classroom presets are the phrase bank's own Hindi phrases, so every one
// of them actually plays in Ho, Mundari, Kurukh and Sadri. Anything else a
// teacher says is answered honestly: translated for Santali, refused with
// the bank's list for the four phrase-bank languages.
const CLASSROOM_PROMPTS = [
  { label: "जल जीवन", text: "पानी हमारा जीवन है" },
  { label: "नमस्ते", text: "नमस्ते" },
  { label: "किताब खोलो", text: "किताब खोलो" },
  { label: "यहाँ बैठो", text: "यहाँ बैठो" },
  { label: "स्कूल चलो", text: "स्कूल चलो" },
];

// Wall-clock seconds since `start`, for the measured-latency pill.
const clock = () => performance.now();

// Live mode — one instruction, one language, as fast as the routes allow.
//
// Uses exactly the capabilities GET /languages reports (RULES.md §5):
// /translate where a real model exists (Santali, text only — no voice),
// /speak's phrase bank for the rest. Nothing here translates into Ho,
// Mundari, Kurukh or Sadri, because nothing can (PRD.md §4).
export default function LiveClassroom({ onLoadIntoStudio }) {
  const [dialects, setDialects] = useState([]);
  const [inputText, setInputText] = useState("");
  // How the current text got here, so a lesson opened in the Studio is
  // logged with the right source_type ("typed" or "asr").
  const [inputSource, setInputSource] = useState("typed");
  const [selectedLang, setSelectedLang] = useState("sat");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  // Real measured latency (never faked)
  const [measuredLatencySec, setMeasuredLatencySec] = useState(null);
  const [liveResult, setLiveResult] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    fetchLanguages()
      .then((rows) => {
        if (!cancelled) setDialects(rows);
      })
      .catch((e) => {
        if (!cancelled) setError("Couldn't load the language list. " + e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
            setInputSource("asr");
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
    const language = dialects.find((d) => d.code === langCode);
    if (!query || !language) return;

    setIsProcessing(true);
    setError("");
    setLiveResult(null);
    setMeasuredLatencySec(null);
    const startTime = clock();

    try {
      const base = { originalHindi: query, language };
      const target = translateTargetFor(language);
      let result;
      if (target) {
        setStatusMessage(`Translating into ${language.name}…`);
        const t = await translate(query, target);
        result = { ...base, kind: "translation", text: t.translated, contaminated: t.script_contamination };
      } else {
        setStatusMessage(`Looking for this in the ${language.name} phrase bank…`);
        result = { ...base, ...(await speakResult(query, language)) };
      }
      setMeasuredLatencySec(((clock() - startTime) / 1000).toFixed(2));
      setLiveResult(result);
    } catch (err) {
      setError("Processing failed: " + err.message);
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  }

  // /speak either plays a bank phrase (and names it) or refuses. The
  // spoken text shown is the one /speak names; without that header the
  // Hindi that was sent is shown as Hindi, never as the target language.
  async function speakResult(text, language) {
    const r = await speak(text, language.code);
    if (r.kind === "audio") {
      return { kind: "audio", audioBlob: r.blob, text: r.targetText, textIsTarget: Boolean(r.targetText), asked: text };
    }
    return { kind: "refused", reason: r.reason, options: r.options ?? [] };
  }

  async function playBankPhrase(phrase) {
    const language = liveResult?.language;
    if (!language) return;
    setError("");
    try {
      const r = await speakResult(phrase.hindi_source, language);
      setLiveResult({ ...liveResult, ...r, originalHindi: phrase.hindi_source });
    } catch (err) {
      setError("Couldn't make the audio. " + err.message);
    }
  }

  return (
    <section className="live-classroom-section" aria-labelledby="live-heading">
      <div className="section-eyebrow">
        <span className="eyebrow-tag">कक्षा १–५ त्वरित संवाद</span>
        <span>शिक्षक मौखिक सहायक · लाइव कक्षा उच्चारण (Live Classroom Mode)</span>
      </div>
      <h1 id="live-heading" className="screen-title">
        Live Classroom <span lang="hi">(लाइव कक्षा शिक्षण)</span>
      </h1>
      <p className="screen-subtitle">
        Speak or type one Hindi instruction. Santali comes back as translated text (it has no voice yet). Ho, Mundari, Kurukh and Sadri play only when the instruction is one of the curated phrase-bank phrases, each checked by native speakers.
      </p>

      {/* Dialect Selector Bar */}
      <div className="live-lang-picker sun-card-shadow">
        <span className="picker-label">Target Classroom Tongue:</span>
        <div className="picker-buttons">
          {dialects.map((d) => (
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
              <span className="lang-btn-name">
                {d.name}
                {nativeName(d) && <span lang={d.code}> {nativeName(d)}</span>}
              </span>
              <span className={`lang-btn-tag tag-${d.translation === "full" ? "neural" : "transfer"}`}>
                {capabilityBadge(d)}
              </span>
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
                : "Or type a classroom phrase below."}
            </p>
          </div>
        </div>

        {/* Input Text Box */}
        <div className="live-input-box">
          <input
            type="text"
            className="live-text-input"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setInputSource("typed");
            }}
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
                  setInputSource("typed");
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
                <span className="lang-badge">{liveResult.language.name}</span>
                <span className="badge">{capabilityBadge(liveResult.language)}</span>
              </div>
              {measuredLatencySec && (
                <span className="latency-pill" title="Actual end-to-end API execution time">
                  <span className="material-symbols-outlined text-xs">timer</span>
                  <span>Measured Latency: <strong>{measuredLatencySec}s</strong></span>
                </span>
              )}
            </div>

            {/* Giant native script — only for text that really is the
                target language: a translation, or the phrase /speak named. */}
            {liveResult.kind === "translation" && (
              <>
                <div className="giant-native-display" lang={liveResult.language.code}>
                  {liveResult.text}
                </div>
                {liveResult.contaminated && (
                  <p className="warn">
                    The model doesn't know a word in this sentence, so part of
                    this line is in the wrong script. Try simpler, more local wording.
                  </p>
                )}
                {liveResult.language.tts === "none" && (
                  <p className="note">
                    {liveResult.language.note ?? "There is no voice for this language."} This is text only.
                  </p>
                )}
              </>
            )}

            {liveResult.kind === "audio" &&
              (liveResult.textIsTarget ? (
                <div className="giant-native-display" lang={liveResult.language.code}>
                  {liveResult.text}
                </div>
              ) : (
                <p className="asked-for">
                  The {liveResult.language.name} phrase for <span lang="hi">{liveResult.asked}</span>
                </p>
              ))}

            {liveResult.kind === "refused" && (
              <>
                <p className="note">{liveResult.reason}</p>
                <p className="field-label">What BOLI can say in {liveResult.language.name} today</p>
                <ul className="phrase-options">
                  {liveResult.options.map((phrase) => (
                    <li key={phrase.id}>
                      <span lang="hi">{phrase.hindi_source}</span> —{" "}
                      <span className="in-script" lang={liveResult.language.code}>
                        {phrase.target_text}
                      </span>{" "}
                      <button className="link" onClick={() => playBankPhrase(phrase)}>
                        Play this one
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {liveResult.originalHindi && (
              <div className="simplified-subtext" lang="hi">
                <span>शिक्षक का वाक्य (Hindi): </span>
                <strong>{liveResult.originalHindi}</strong>
              </div>
            )}

            {/* Audio Player */}
            {liveResult.kind === "audio" && (
              <div className="live-audio-wrap">
                <AudioPlayer blob={liveResult.audioBlob} label={`${liveResult.language.name} audio`} />
                <p className="section-note">{phraseBankNote(liveResult.language)}</p>
              </div>
            )}

            {/* Classroom Chanting Guide — only when there is audio to chant along to. */}
            {liveResult.kind === "audio" && (
            <div className="classroom-chant-banner">
              <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                groups
              </span>
              <div>
                <strong>कक्षा अभ्यास (Chant Together!):</strong>
                <p>शिक्षक एक बार ऑडियो बजाएं, फिर सभी बच्चे एक साथ तीन बार दोहराएं।</p>
              </div>
            </div>
            )}

            {/* Bridge to Studio */}
            {onLoadIntoStudio && (
              <div className="live-footer-actions">
                <button
                  type="button"
                  className="button button--secondary tactile-btn-secondary"
                  onClick={() => onLoadIntoStudio(liveResult.originalHindi, inputSource)}
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
