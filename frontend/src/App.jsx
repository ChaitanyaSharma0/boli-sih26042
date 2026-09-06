import { useRef, useState } from "react";
import Capture from "./screens/Capture";
import LanguageSelect from "./screens/LanguageSelect";
import Result from "./screens/Result";

// ponytail: three linear screens, so a step index replaces a router.
// Add react-router only if a screen ever needs its own shareable URL.

const STEPS = ["Capture", "Languages", "Result"];

function Stepper({ step }) {
  return (
    <nav className="progress" aria-label="Lesson progress">
      <ol>
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={
              index === step ? "is-current" : index < step ? "is-done" : ""
            }
            aria-current={index === step ? "step" : undefined}
          >
            <span className="step-number" aria-hidden="true">
              {index < step ? "✓" : index + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [hindiText, setHindiText] = useState("");
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

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="app-header">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            बो
          </span>
          <span>
            <strong>BOLI</strong>
            <small>One lesson. More voices.</small>
          </span>
        </span>
        <span className="event-label">SIH26042</span>
      </header>

      <Stepper step={step} />

      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {step === 0 && (
          <Capture
            hindiText={hindiText}
            setHindiText={setHindiText}
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
            sourceType={sourceType}
            selectedLangs={selectedLangs}
            onBack={back}
          />
        )}
      </main>

      {/* The scope boundary is on every screen, including the chrome.
          Santali is the only one of these languages with a translation
          model; the other four are a curated phrase bank (PRD.md §4). */}
      <footer className="app-footer">
        <strong>BOLI</strong> · Built for Jharkhand's multilingual classrooms
        <span>
          Santali: real AI translation, no voice · Ho, Mundari, Kurukh, Sadri:
          curated phrase bank only, pending validation
        </span>
      </footer>
    </div>
  );
}
