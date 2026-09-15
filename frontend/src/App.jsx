import { useRef, useState } from "react";
import Capture from "./screens/Capture";
import LanguageSelect from "./screens/LanguageSelect";
import Result from "./screens/Result";
import Logo from "./components/Logo";
import JharkhandGovLogo from "./components/JharkhandGovLogo";
import TopUtilityBar from "./components/TopUtilityBar";
import ConversationMode from "./components/ConversationMode";
import PublicServicesSection from "./components/PublicServicesSection";
import LanguagesSection from "./components/LanguagesSection";
import HowItWorksSection from "./components/HowItWorksSection";
import GlobalFooter from "./components/GlobalFooter";
import Dock from "./components/motion/Dock";

const STEPS = [
  { num: 1, label: "Capture Lesson" },
  { num: 2, label: "Select Languages" },
  { num: 3, label: "Listen & Speak" },
];

function Stepper({ step, onSelectStep }) {
  return (
    <nav className="progress-container" aria-label="Lesson progress">
      <ol className="progress">
        {STEPS.map((s, index) => (
          <li
            key={s.label}
            className={
              index === step ? "is-current" : index < step ? "is-done" : ""
            }
            aria-current={index === step ? "step" : undefined}
            onClick={() => onSelectStep && onSelectStep(index)}
            style={{ cursor: "pointer" }}
          >
            <span className="step-number" aria-hidden="true">
              {index < step ? "✓" : s.num}
            </span>
            <span>{s.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("studio"); // "studio" | "conversation" | "services" | "languages" | "how-it-works"
  const [activeLang, setActiveLang] = useState("hi");
  const [step, setStep] = useState(0);
  const [hindiText, setHindiText] = useState("");
  const [grade, setGrade] = useState(2);
  const [chapterSentences, setChapterSentences] = useState([]);
  const [sourceType, setSourceType] = useState("typed");
  const [selectedLangs, setSelectedLangs] = useState([]);
  const mainRef = useRef(null);

  function go(nextStep) {
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

  const dockItems = [
    {
      id: "capture-step",
      icon: "edit_note",
      title: "Step 1: Capture Lesson",
      badge: "1",
      active: activeTab === "studio" && step === 0,
      onClick: () => {
        setActiveTab("studio");
        go(0);
      },
    },
    {
      id: "languages-step",
      icon: "translate",
      title: "Step 2: Tribal Dialects",
      badge: "2",
      active: activeTab === "studio" && step === 1,
      onClick: () => {
        setActiveTab("studio");
        go(1);
      },
    },
    {
      id: "audio-step",
      icon: "record_voice_over",
      title: "Step 3: Listen & Speak",
      badge: "3",
      active: activeTab === "studio" && step === 2,
      onClick: () => {
        setActiveTab("studio");
        go(2);
      },
    },
    {
      id: "conversation-tab",
      icon: "forum",
      title: "Bilingual Conversation Mode",
      badge: "2-Way",
      active: activeTab === "conversation",
      onClick: () => {
        setActiveTab("conversation");
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    },
    {
      id: "speaker-test",
      icon: "volume_up",
      title: "Speaker Chime Test",
      badge: "Test",
      active: false,
      onClick: playSpeakerChime,
    },
    {
      id: "reset-lesson",
      icon: "restart_alt",
      title: "Start New Lesson",
      active: false,
      onClick: () => {
        setHindiText("");
        setChapterSentences([]);
        setActiveTab("studio");
        go(0);
      },
    },
  ];

  return (
    <div className="app-shell">
      {/* Top Government-Grade Utility Bar (Accessibility & SIH Identification) */}
      <TopUtilityBar activeLang={activeLang} onToggleLang={setActiveLang} />

      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {/* Main Government Portal Header */}
      <header className="app-header-bar sun-card-shadow">
        <div className="header-brand">
          <Logo size="small" showTagline={true} />
        </div>

        {/* Global Navigation Tabs (Section 8 of Prompt) */}
        <nav className="header-nav-tabs" aria-label="Primary Platform Navigation">
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
            className={`nav-tab-link ${activeTab === "conversation" ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab("conversation");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="material-symbols-outlined text-sm">forum</span>
            <span>Conversation (संवाद)</span>
          </button>
          <button
            type="button"
            className={`nav-tab-link ${activeTab === "services" ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab("services");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="material-symbols-outlined text-sm">public</span>
            <span>Public Services (जन सेवाएँ)</span>
          </button>
          <button
            type="button"
            className={`nav-tab-link ${activeTab === "languages" ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab("languages");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="material-symbols-outlined text-sm">language</span>
            <span>Languages (भाषाएँ)</span>
          </button>
          <button
            type="button"
            className={`nav-tab-link ${activeTab === "how-it-works" ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab("how-it-works");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="material-symbols-outlined text-sm">account_tree</span>
            <span>How It Works</span>
          </button>
        </nav>

        {/* Stepper only when in studio mode */}
        {activeTab === "studio" && (
          <div className="header-stepper">
            <Stepper step={step} onSelectStep={go} />
          </div>
        )}

        <div className="header-meta">
          <JharkhandGovLogo size={42} />
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

        {activeTab === "conversation" && <ConversationMode />}

        {activeTab === "services" && (
          <PublicServicesSection
            onLoadIntoStudio={(text) => {
              setHindiText(text);
              setChapterSentences([]);
              setActiveTab("studio");
              go(0);
            }}
          />
        )}

        {activeTab === "languages" && <LanguagesSection />}

        {activeTab === "how-it-works" && <HowItWorksSection />}

        {/* When in Studio mode, also offer smooth anchor access to the supporting sections below */}
        {activeTab === "studio" && (
          <>
            <div className="studio-sections-divider" />
            <PublicServicesSection
              onLoadIntoStudio={(text) => {
                setHindiText(text);
                setChapterSentences([]);
                go(0);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
            <LanguagesSection />
            <HowItWorksSection />
          </>
        )}
      </main>

      {/* Quick Apple-style Dock for Teachers & Field Workers */}
      <Dock items={dockItems} />

      {/* Government-Grade Footer with SIH Prototype Disclaimers */}
      <GlobalFooter />
    </div>
  );
}
