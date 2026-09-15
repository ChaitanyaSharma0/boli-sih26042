import { useRef, useState } from "react";
import Capture from "./screens/Capture";
import LanguageSelect from "./screens/LanguageSelect";
import Result from "./screens/Result";
import Logo from "./components/Logo";
import JharkhandGovLogo from "./components/JharkhandGovLogo";
import Dock from "./components/motion/Dock";

// ponytail: three linear screens, so a step index replaces a router.
// Add react-router only if a screen ever needs its own shareable URL.

const STEPS = [
  { num: 1, label: "Capture Lesson" },
  { num: 2, label: "Select Languages" },
  { num: 3, label: "Listen & Speak" },
];

function Stepper({ step }) {
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
  const [step, setStep] = useState(0);
  const [hindiText, setHindiText] = useState("");
  // Grade-level selector: Class 1-5 (default Class 2)
  const [grade, setGrade] = useState(2);
  // PDF Chapter extracted sentences
  const [chapterSentences, setChapterSentences] = useState([]);
  // Whether the text came off a photo or a keyboard, for the lesson row.
  const [sourceType, setSourceType] = useState("typed");
  const [selectedLangs, setSelectedLangs] = useState([]);
  const mainRef = useRef(null);

  // State lives here, not in the screens, because it flows forward:
  // screen 1 produces hindiText, screen 2 produces selectedLangs, and
  // screen 3 consumes both (ARCHITECTURE.md §5).
  function go(nextStep) {
    setStep(nextStep);
    // Moving between screens replaces the whole page: send focus to the
    // new content so a keyboard or screen-reader user is not left on a
    // button that no longer exists.
    requestAnimationFrame(() => {
      mainRef.current?.focus();
      window.scrollTo({ top: 0 });
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
      // AudioContext unavailable or restricted by browser policy
    }
  }

  const dockItems = [
    {
      id: "capture-step",
      icon: "edit_note",
      title: "Step 1: Capture Lesson",
      badge: "1",
      active: step === 0,
      onClick: () => go(0),
    },
    {
      id: "languages-step",
      icon: "translate",
      title: "Step 2: Tribal Dialects",
      badge: "2",
      active: step === 1,
      onClick: () => go(1),
    },
    {
      id: "audio-step",
      icon: "record_voice_over",
      title: "Step 3: Listen & Speak",
      badge: "3",
      active: step === 2,
      onClick: () => go(2),
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
        go(0);
      },
    },
  ];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="app-header-bar sun-card-shadow">
        <div className="header-brand">
          <Logo size="small" showTagline={true} />
        </div>
        <div className="header-stepper">
          <Stepper step={step} />
        </div>
        <div className="header-meta">
          <JharkhandGovLogo size={42} />
        </div>
      </header>

      <main id="main-content" ref={mainRef} tabIndex={-1}>
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
      </main>

      <Dock items={dockItems} />

      {/* The scope boundary is on every screen, including the chrome.
          Santali is the only one of these languages with a translation
          model; the other four are a curated phrase bank (PRD.md §4). */}
      <footer className="app-footer sun-card-shadow">
        <div className="footer-top-row">
          <div className="footer-brand-initiative">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              spa
            </span>
            <strong>BOLI बोली</strong>
            <span>· Jharkhand Multilingual Primary Initiative (DIET Pilot)</span>
          </div>
          <div className="footer-links">
            <a href="#curriculum" className="footer-link">DIET Guidelines</a>
            <a href="#phonetics" className="footer-link">Phonetic Guide</a>
            <a href="mailto:support@jepc.jharkhand.gov.in" className="footer-link">Helpdesk</a>
          </div>
        </div>
        <div className="footer-boundary-note">
          <strong>Classroom Honesty Boundary: </strong>
          Santali: real AI translation, no voice · Ho, Mundari, Kurukh, Sadri:
          curated phrase bank only, pending validation
        </div>
      </footer>
    </div>
  );
}
