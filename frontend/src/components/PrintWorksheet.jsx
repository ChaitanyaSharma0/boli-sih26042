import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function PrintWorksheet({
  isOpen,
  onClose,
  hindiText,
  adapted,
  translations = [],
  grade = 2,
  audio = {},
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    // Use current URL or API base for audio link
    const audioUrl =
      window.location.origin +
      "/#audio-lesson-grade-" +
      grade;

    QRCode.toDataURL(audioUrl, {
      width: 140,
      margin: 1,
      color: { dark: "#1E3A5F", light: "#FFFFFF" },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code error:", err));
  }, [isOpen, grade]);

  if (!isOpen) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content worksheet-modal">
        <div className="modal-header no-print">
          <h2>Printable Classroom Worksheet</h2>
          <div className="modal-actions">
            <button className="button button--primary tactile-btn-primary" onClick={handlePrint}>
              <span className="material-symbols-outlined text-base">print</span>
              <span>Print / Save as PDF</span>
            </button>
            <button className="button button--secondary tactile-btn-secondary" onClick={onClose}>
              <span className="material-symbols-outlined text-base">close</span>
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* The Printable A4 Worksheet Sheet */}
        <div className="worksheet-sheet">
          <header className="worksheet-header">
            <div className="worksheet-branding">
              <div className="worksheet-logo">बो</div>
              <div>
                <h1 className="worksheet-title">BOLI — Multilingual Classroom Worksheet</h1>
                <p className="worksheet-subtitle">
                  SIH Prototype · Primary Mother-Tongue Learning Aid
                </p>
              </div>
            </div>
            <div className="worksheet-badge">Class {grade}</div>
          </header>

          <div className="worksheet-student-bar">
            <div><strong>Student Name:</strong> ___________________________</div>
            <div><strong>Roll No:</strong> _______</div>
            <div><strong>Date:</strong> _________</div>
          </div>

          <section className="worksheet-section">
            <h3 className="section-heading">1. Original Textbook Lesson (Hindi)</h3>
            <div className="worksheet-box hindi-box" lang="hi">
              {hindiText}
            </div>
          </section>

          {adapted && (
            <section className="worksheet-section">
              <h3 className="section-heading">
                2. Classroom Simplified Hindi (आसान हिंदी)
                <span className="concept-tag">{adapted.concept}</span>
              </h3>
              <div className="worksheet-box simplified-box" lang="hi">
                <ol className="worksheet-sentences">
                  {adapted.adapted_hindi.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ol>
              </div>

              {adapted.substitutions?.length > 0 && (
                <div className="worksheet-subs">
                  <strong>Cultural Vocabulary Adaptation:</strong>
                  {adapted.substitutions.map((sub, idx) => (
                    <span key={idx} className="sub-tag">
                      {sub.from} → <strong>{sub.to}</strong> ({sub.why})
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="worksheet-section">
            <h3 className="section-heading">3. Mother-Tongue Translations & Transliterations</h3>
            <div className="worksheet-languages-grid">
              {translations.map((t, idx) => (
                <div key={idx} className="worksheet-lang-card">
                  <div className="lang-card-header">
                    <span className="lang-name">{t.name}</span>
                    <span className="lang-tag">Classroom translation</span>
                  </div>
                  <div className="lang-text" lang={t.code}>
                    {t.translated}
                  </div>
                </div>
              ))}

              {/* Show spoken phrase bank languages target text */}
              {Object.entries(audio).map(([langCode, a]) => {
                if (a.kind !== "audio" || !a.targetText) return null;
                const names = { hoc: "Ho (ᱦᱳ)", unr: "Mundari (ᱢᱩᱱᱰᱟᱨᱤ)", kru: "Kurukh (कुड़ुख़)", sck: "Sadri (सादरी)" };
                return (
                  <div key={langCode} className="worksheet-lang-card">
                    <div className="lang-card-header">
                      <span className="lang-name">{names[langCode] || langCode}</span>
                      <span className="lang-tag">Spoken phrase bank</span>
                    </div>
                    <div className="lang-text" lang={langCode}>
                      {a.targetText}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <footer className="worksheet-footer">
            <div className="footer-qr-container">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR code to listen to audio"
                  className="worksheet-qr"
                />
              )}
              <div className="qr-info">
                <strong>🔊 Scan with phone camera to listen to spoken lesson audio</strong>
                <p>Teacher can play mother-tongue audio directly to students without typing.</p>
              </div>
            </div>
            <div className="footer-note">
              BOLI · SIH26042 · Designed for Jharkhand's Multilingual Classrooms
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
