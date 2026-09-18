import { useState, useEffect } from "react";
import logoSrc from "../assets/logo.png";

export default function TopUtilityBar() {
  const [fontSizeLevel, setFontSizeLevel] = useState(0); // -1, 0, 1
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (fontSizeLevel === -1) {
      root.style.fontSize = "14px";
    } else if (fontSizeLevel === 1) {
      root.style.fontSize = "18px";
    } else {
      root.style.fontSize = "16px";
    }
  }, [fontSizeLevel]);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add("high-contrast-mode");
    } else {
      document.body.classList.remove("high-contrast-mode");
    }
  }, [highContrast]);

  return (
    <div className="top-gov-utility-bar" role="region" aria-label="Portal Utility Bar">
      <div className="utility-bar-inner">
        <div className="utility-left">
          <div
            className="utility-logo-badge"
            style={{
              position: "relative",
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              overflow: "hidden",
              background: "#421d00",
              boxShadow: "0 1px 4px rgba(0, 0, 0, 0.25)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={logoSrc}
              alt="Boli Emblem"
              className="utility-logo-img"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-54.86%, -47.5%)",
                width: "140%",
                height: "auto",
                display: "block",
                pointerEvents: "none",
              }}
            />
          </div>
          <div className="utility-title-stack">
            <span className="utility-gov-title">
              <strong>Boli बोली</strong>
              <span className="utility-title-sep">·</span>
              <span className="utility-title-desc">Multilingual Primary Learning</span>
            </span>
            <span className="utility-badge-sih">SIH Prototype · SIH26042</span>
          </div>
        </div>

        <div className="utility-right">
          {/* Accessibility Font Size Scaling */}
          <div className="accessibility-scaler" aria-label="Text Size Controls">
            <span className="scaler-label">Font:</span>
            <button
              type="button"
              className={`scale-btn ${fontSizeLevel === -1 ? "active" : ""}`}
              onClick={() => setFontSizeLevel(-1)}
              title="Decrease text size"
              aria-label="Decrease text size (A-)"
            >
              A-
            </button>
            <button
              type="button"
              className={`scale-btn ${fontSizeLevel === 0 ? "active" : ""}`}
              onClick={() => setFontSizeLevel(0)}
              title="Reset default text size"
              aria-label="Default text size (A)"
            >
              A
            </button>
            <button
              type="button"
              className={`scale-btn ${fontSizeLevel === 1 ? "active" : ""}`}
              onClick={() => setFontSizeLevel(1)}
              title="Increase text size"
              aria-label="Increase text size (A+)"
            >
              A+
            </button>
          </div>

          {/* High Contrast Toggle */}
          <button
            type="button"
            className={`utility-contrast-btn ${highContrast ? "is-active" : ""}`}
            onClick={() => setHighContrast(!highContrast)}
            title="Toggle High Contrast Mode"
            aria-pressed={highContrast}
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              contrast
            </span>
            <span>{highContrast ? "Normal" : "High Contrast"}</span>
          </button>


          <a href="#help-faq" className="utility-help-link">
            <span className="material-symbols-outlined text-sm">help</span>
            <span>Help</span>
          </a>
        </div>
      </div>
    </div>
  );
}
