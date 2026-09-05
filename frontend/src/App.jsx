import { useState } from "react";
import Capture from "./screens/Capture";
import LanguageSelect from "./screens/LanguageSelect";
import Result from "./screens/Result";

// ponytail: three linear screens, so a step index replaces a router.
// Add react-router only if a screen ever needs its own shareable URL.
export default function App() {
  const [step, setStep] = useState(0);
  const [hindiText, setHindiText] = useState("");
  const [selectedLangs, setSelectedLangs] = useState([]);

  // State lives here, not in the screens, because it flows forward:
  // screen 1 produces hindiText, screen 2 produces selectedLangs, and
  // screen 3 consumes both (ARCHITECTURE.md §5).
  const next = () => setStep((s) => Math.min(s + 1, 2));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <main>
      <h1>BOLI</h1>
      {step === 0 && (
        <Capture
          hindiText={hindiText}
          setHindiText={setHindiText}
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
          selectedLangs={selectedLangs}
          onBack={back}
        />
      )}
    </main>
  );
}
