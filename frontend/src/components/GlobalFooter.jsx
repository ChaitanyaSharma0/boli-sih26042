export default function GlobalFooter() {
  return (
    <footer className="app-global-footer sun-card-shadow" role="contentinfo">
      {/* Top Institutional Row */}
      <div className="footer-main-grid">
        <div className="footer-col-brand">
          <div className="footer-brand-header">
            <img
              src="/logo.png"
              alt="Boli Logo"
              width="32"
              height="32"
              className="footer-logo-img"
            />
            <div className="footer-brand-title">
              <strong>boli</strong>
              <span>बोली · SIH Prototype</span>
            </div>
          </div>
          <p className="footer-mission-text">
            A proposed multilingual digital service for breaking language barriers between citizens, schools, and public services across Jharkhand. Developed for Smart India Hackathon (SIH26042).
          </p>
          <div className="footer-status-pill">
            <span className="status-dot-active" />
            <span>SIH26042 Proposed Solution · Offline-First Engine</span>
          </div>
        </div>

        <div className="footer-col-nav">
          <h4 className="footer-col-heading">Platform Navigation</h4>
          <ul className="footer-links-list">
            <li><a href="#studio-section">Lesson & Translation Studio</a></li>
            <li><a href="#conversation-section">Bilingual Conversation Mode</a></li>
            <li><a href="#services-section">Public & School Services</a></li>
            <li><a href="#languages-section">Languages of Jharkhand</a></li>
            <li><a href="#how-it-works">How Boli Operates</a></li>
            <li><a href="#technology-section">Technology Architecture</a></li>
          </ul>
        </div>

        <div className="footer-col-nav">
          <h4 className="footer-col-heading">Supported Mother Tongues</h4>
          <ul className="footer-links-list">
            <li><a href="#languages-section">Santali (Ol Chiki ᱥᱟᱱᱛᱟᱲᱤ)</a></li>
            <li><a href="#languages-section">Ho (Warang Chiti 𑢹𑣉 ᱡᱟᱜᱟᱨ)</a></li>
            <li><a href="#languages-section">Mundari (मुंडारी)</a></li>
            <li><a href="#languages-section">Kurukh / Oraon (कुड़ुख़)</a></li>
            <li><a href="#languages-section">Sadri / Nagpuri (नागपुरी)</a></li>
          </ul>
        </div>

        <div className="footer-col-nav">
          <h4 className="footer-col-heading">Accessibility & Governance</h4>
          <ul className="footer-links-list">
            <li><a href="#accessibility">WCAG 2.1 AA Accessibility</a></li>
            <li><a href="#phonetics">JCERT Primary Guidelines</a></li>
            <li><a href="#honesty">Scientific Honesty Boundary</a></li>
            <li><a href="mailto:support@jepc.jharkhand.gov.in">Technical Feedback</a></li>
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
          <strong>Boli (बोली)</strong> is an academic prototype developed as a proposed technology solution for the Smart India Hackathon problem statement. It is designed to demonstrate how public-service and educational translation can realistically function in Jharkhand. It is not an officially commissioned Government of Jharkhand portal unless formally notified.
        </p>
      </div>

      {/* Classroom Scientific Honesty Boundary */}
      <div className="footer-honesty-row">
        <span><strong>Pedagogical Boundary: </strong>Santali: Real AI neural translation (IndicTrans2, text-only) · Ho, Mundari, Kurukh, Sadri: Curated validated phrase bank only with native phonetics.</span>
        <span>© 2026 Boli Project · SIH26042 Solution</span>
      </div>
    </footer>
  );
}
