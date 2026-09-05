import { useState } from "react";
import Capture from "./screens/Capture";
import LanguageSelect from "./screens/LanguageSelect";
import Result from "./screens/Result";

// ponytail: three linear screens, so a step index replaces a router.
// Add react-router only if a screen ever needs its own shareable URL.
const SCREENS = [Capture, LanguageSelect, Result];

export default function App() {
  const [step, setStep] = useState(0);
  const Screen = SCREENS[step];

  return (
    <main>
      <h1>BOLI</h1>
      <Screen
        onNext={() => setStep((s) => Math.min(s + 1, SCREENS.length - 1))}
        onBack={() => setStep((s) => Math.max(s - 1, 0))}
      />
    </main>
  );
}
