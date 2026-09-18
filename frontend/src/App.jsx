import { useRef, useState } from "react";
import Capture from "./screens/Capture";
import LanguageSelect from "./screens/LanguageSelect";
import Result from "./screens/Result";
import Logo from "./components/Logo";
import TopUtilityBar from "./components/TopUtilityBar";
import LanguagesSection from "./components/LanguagesSection";
import HowItWorksSection from "./components/HowItWorksSection";
import GlobalFooter from "./components/GlobalFooter";
import ForestBackground from "./components/ForestBackground";
import LiveClassroom from "./components/LiveClassroom";

const STEPS = [
  { num: 1, label: "Capture Lesson" },
  { num: 2, label: "Select Languages" },
  { num: 3, label: "Listen & Speak" },
];

function Stepper({ step, onSelectStep, canGoToStep }) {
  return (
    <nav className="progress-container" aria-label="Lesson progress">
      <ol className="progress">
        {STEPS.map((s, index) => {
          const isAllowed = canGoToStep ? canGoToStep(index) : true;
          return (
            <li
              key={s.label}
              className={`${
                index === step ? "is-current" : index < step ? "is-done" : ""
              } ${!isAllowed ? "is-disabled" : ""}`}
              aria-current={index === step ? "step" : undefined}
              aria-disabled={!isAllowed}
              onClick={() => {
                if (isAllowed && onSelectStep) {
                  onSelectStep(index);
                }
              }}
              style={{
                cursor: isAllowed ? "pointer" : "not-allowed",
                opacity: isAllowed ? 1 : 0.45,
              }}
              title={
                !isAllowed
                  ? index === 1
                    ? "Enter lesson text first"
                    : "Select tribal dialects first"
                  : undefined
              }
            >
              <span className="step-number" aria-hidden="true">
                {index < step ? "✓" : s.num}
              </span>
              <span>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("studio"); // "studio" | "live" | "languages" | "how-it-works"
  const [step, setStep] = useState(0);
  const [hindiText, setHindiText] = useState("");
  const [grade, setGrade] = useState(2);
  const [chapterSentences, setChapterSentences] = useState([]);
  const [sourceType, setSourceType] = useState("typed");
  const [selectedLangs, setSelectedLangs] = useState([]);
  const mainRef = useRef(null);

  function canGoToStep(targetStep) {
    if (targetStep <= step) return true;
    const hasText = hindiText.trim().length > 0 || chapterSentences.length > 0;
    if (targetStep === 1) return hasText;
    if (targetStep === 2) return hasText && selectedLangs.length > 0;
    return false;
  }

  function go(nextStep) {
    if (!canGoToStep(nextStep)) return;
    setStep(nextStep);
    requestAnimationFrame(() => {
      mainRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const next = () => go(Math.min(step + 1, 2));
  const back = () => go(Math.max(step - 1, 0));

  // Audio chime for teacher to verify classroom bluetooth or wired speakers
  function playSpeakerChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 bright chime
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + idx * 0.1;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch {
      // AudioContext unavailable or restricted
    }
  }

  return (
    <>
      <ForestBackground />
      <div className="app-shell">
        {/* Top utility bar: text size, contrast, SIH identification */}
        <TopUtilityBar />

      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {/* Main header */}
      <header className="app-header-bar sun-card-shadow">
        <div className="header-brand">
          <Logo size="small" showTagline={true} />
        </div>

        {/* Global Navigation Tabs */}
        <nav className="header-nav-tabs" aria-label="Primary Platform Navigation">
          <div className="nav-tabs-primary">
            <button
              type="button"
              className={`nav-tab-link ${activeTab === "studio" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("studio");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span className="material-symbols-outlined text-sm">auto_stories</span>
              <span>Studio (शिक्षण)</span>
            </button>
            <button
              type="button"
              className={`nav-tab-link ${activeTab === "live" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("live");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span className="material-symbols-outlined text-sm">mic</span>
              <span>Live Classroom (मौखिक)</span>
            </button>
          </div>

          <div className="nav-tab-separator" aria-hidden="true" />

          <div className="nav-tabs-secondary">
            <button
              type="button"
              className={`nav-tab-link nav-tab-secondary ${activeTab === "languages" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("languages");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span className="material-symbols-outlined text-sm">language</span>
              <span>Languages</span>
            </button>
            <button
              type="button"
              className={`nav-tab-link nav-tab-secondary ${activeTab === "how-it-works" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("how-it-works");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span className="material-symbols-outlined text-sm">account_tree</span>
              <span>How It Works</span>
            </button>
          </div>
        </nav>

        {/* Stepper only when in studio mode */}
        {activeTab === "studio" && (
          <div className="header-stepper">
            <Stepper step={step} onSelectStep={go} canGoToStep={canGoToStep} />
          </div>
        )}

        <div className="header-meta">
          <div className="header-utility-group">
            <button
              type="button"
              className="header-util-btn"
              onClick={playSpeakerChime}
              title="Classroom Speaker Test (Plays chime on classroom bluetooth or wired audio)"
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>volume_up</span>
              <span className="util-btn-text">Speaker Test</span>
            </button>
            <button
              type="button"
              className="header-util-btn"
              onClick={() => {
                setHindiText("");
                setChapterSentences([]);
                setSourceType("typed");
                setActiveTab("studio");
                go(0);
              }}
              title="Start New Lesson (Resets input and returns to Step 1)"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              <span className="util-btn-text">New Lesson</span>
            </button>
          </div>
          <div className="sih-initiative-badge">
            <span className="initiative-dot" />
            <span>SIH26042</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {activeTab === "studio" && (
          <div id="studio-section">
            {step === 0 && (
              <Capture
                hindiText={hindiText}
                setHindiText={setHindiText}
                grade={grade}
                setGrade={setGrade}
                chapterSentences={chapterSentences}
                setChapterSentences={setChapterSentences}
                setSourceType={setSourceType}
                onNext={next}
              />
            )}
            {step === 1 && (
              <LanguageSelect
                selectedLangs={selectedLangs}
                setSelectedLangs={setSelectedLangs}
                onBack={back}
                onNext={next}
              />
            )}
            {step === 2 && (
              <Result
                hindiText={hindiText}
                grade={grade}
                chapterSentences={chapterSentences}
                sourceType={sourceType}
                selectedLangs={selectedLangs}
                onBack={back}
              />
            )}
          </div>
        )}

        {activeTab === "live" && (
          <LiveClassroom
            onLoadIntoStudio={(text) => {
              setHindiText(text);
              setChapterSentences([]);
              setActiveTab("studio");
              go(0);
            }}
            currentGrade={grade}
          />
        )}

        {activeTab === "languages" && <LanguagesSection />}

        {activeTab === "how-it-works" && <HowItWorksSection />}
      </main>

      {/* Footer with the prototype disclaimer and what is real */}
      <GlobalFooter />
    </div>
    </>
  );
}
