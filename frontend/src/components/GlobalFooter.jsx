import logoSrc from "../assets/logo.png";

// Footer links switch tabs: the sections they point at only exist while
// their tab is open, so a plain #anchor would go nowhere.
export default function GlobalFooter({ onNavigate }) {
  const go = (tab) => (e) => {
    e.preventDefault();
    onNavigate?.(tab);
  };
  return (
    <footer className="app-global-footer sun-card-shadow" role="contentinfo">
      {/* Top Institutional Row */}
      <div className="footer-main-grid">
        <div className="footer-col-brand">
          <div className="footer-brand-header">
            <div
              className="footer-logo-badge"
              style={{
                position: "relative",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                overflow: "hidden",
                background: "#421d00",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={logoSrc}
                alt="Boli Logo"
                className="footer-logo-img"
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
            <div className="footer-brand-title">
              <strong>BOLI</strong>
              <span>बोली · SIH Prototype</span>
            </div>
          </div>
          <p className="footer-mission-text">
            A classroom tool for Jharkhand's primary teachers: Hindi lessons simplified for the grade, translated into Santali, and spoken from a checked phrase bank in Ho, Mundari, Kurukh and Sadri. Developed for Smart India Hackathon (SIH26042).
          </p>
          <div className="footer-status-pill">
            <span className="status-dot-active" />
            <span>SIH26042 Prototype · Offline lesson packs</span>
          </div>
        </div>

        <div className="footer-col-nav">
          <h4 className="footer-col-heading">Platform Navigation</h4>
          <ul className="footer-links-list">
            <li><a href="#studio" onClick={go("studio")}>Lesson Studio</a></li>
            <li><a href="#live" onClick={go("live")}>Live Classroom</a></li>
            <li><a href="#languages" onClick={go("languages")}>Languages of Jharkhand</a></li>
            <li><a href="#how-it-works" onClick={go("how-it-works")}>How Boli Works</a></li>
          </ul>
        </div>

        <div className="footer-col-nav">
          <h4 className="footer-col-heading">Supported Mother Tongues</h4>
          <ul className="footer-links-list">
            <li><a href="#languages" onClick={go("languages")}>Santali (Ol Chiki ᱥᱟᱱᱛᱟᱲᱤ)</a></li>
            <li><a href="#languages" onClick={go("languages")}>Ho (हो)</a></li>
            <li><a href="#languages" onClick={go("languages")}>Mundari (मुंडारी)</a></li>
            <li><a href="#languages" onClick={go("languages")}>Kurukh / Oraon (कुड़ुख़)</a></li>
            <li><a href="#languages" onClick={go("languages")}>Sadri / Nagpuri (नागपुरी)</a></li>
          </ul>
        </div>

        <div className="footer-col-nav">
          <h4 className="footer-col-heading">Honest by Design</h4>
          <ul className="footer-links-list">
            <li><a href="#languages" onClick={go("languages")}>What each language can really do</a></li>
            <li><a href="#how-it-works" onClick={go("how-it-works")}>Where translation is real, and where it is not</a></li>
            <li>Text size and high-contrast controls in the top bar</li>
          </ul>
        </div>
      </div>

      {/* Mandatory SIH Prototype Disclaimer (Section 30 of Spec) */}
      <div className="footer-sih-disclaimer-box">
        <div className="disclaimer-header">
          <span className="material-symbols-outlined text-base">info</span>
          <strong>Smart India Hackathon (SIH) Prototype Disclaimer</strong>
        </div>
        <p className="disclaimer-body">
          <strong>Boli (बोली)</strong> is an academic prototype developed as a proposed technology solution for the Smart India Hackathon problem statement. It shows how primary lessons can reach children in their mother tongues honestly: translation only where a real model exists, speech only where a real voice exists. It is not a government service and is not affiliated with any government body.
        </p>
      </div>

      {/* Classroom Scientific Honesty Boundary */}
      <div className="footer-honesty-row">
        <span><strong>What is real: </strong>Santali: real AI translation (IndicTrans2), text only — no voice exists for it yet. Ho, Mundari, Kurukh &amp; Sadri: no translation model exists; BOLI speaks a small curated phrase bank with Meta MMS voices, every phrase checked by native speakers.</span>
        <span>© 2026 Boli Project · SIH26042 Solution</span>
      </div>
    </footer>
  );
}
