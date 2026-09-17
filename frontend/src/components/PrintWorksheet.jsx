import { useEffect, useState } from "react";
import QRCode from "qrcode/lib/browser.js";

const LANGUAGE_METADATA = {
  sat: { name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", script: "Ol Chiki (ᱚᱞ ᱪᱤᱠᱤ)", type: "Neural MT" },
  hoc: { name: "Ho", native: "ᱦᱳ / हो", script: "Devanagari / Warang Citi", type: "Linguistic Transfer" },
  unr: { name: "Mundari", native: "ᱢᱩᱱᱰᱟᱨᱤ / मुंडारी", script: "Devanagari / Mundari Bani", type: "Linguistic Transfer" },
  kru: { name: "Kurukh", native: "कुड़ुख़ / ᱳᱨᱟᱶ", script: "Devanagari / Tolong Siki", type: "Neural MT" },
  sck: { name: "Sadri", native: "सादरी / नागपुरी", script: "Devanagari", type: "Morphological Transfer" },
};

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
      color: { dark: "#004024", light: "#FFFFFF" },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code error:", err));
  }, [isOpen, grade]);

  if (!isOpen) return null;

  function handlePrint() {
    window.print();
  }

  // Deduplicate and assemble mother-tongue items
  const displayLangs = [];
  const seenCodes = new Set();

  for (const t of translations) {
    if (!t.translated) continue;
    const meta = LANGUAGE_METADATA[t.code] || { name: t.name || t.code, native: "", script: "Devanagari", type: "Translation" };
    displayLangs.push({
      code: t.code,
      name: meta.name,
      native: meta.native,
      script: meta.script,
      type: meta.type,
      text: t.translated,
      source: "translation",
    });
    seenCodes.add(t.code);
  }

  for (const [langCode, a] of Object.entries(audio)) {
    if (seenCodes.has(langCode) || a.kind !== "audio" || !a.targetText) continue;
    const meta = LANGUAGE_METADATA[langCode] || { name: langCode, native: "", script: "Devanagari", type: "Spoken Phrase" };
    displayLangs.push({
      code: langCode,
      name: meta.name,
      native: meta.native,
      script: meta.script,
      type: meta.type,
      text: a.targetText,
      source: "audio_target",
    });
    seenCodes.add(langCode);
  }

  return (
    <div className="modal-backdrop worksheet-modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content worksheet-modal-dialog">
        {/* Interactive Top Actions (Hidden during physical print) */}
        <div className="worksheet-modal-toolbar no-print">
          <div className="toolbar-left">
            <span className="material-symbols-outlined text-primary">description</span>
            <div>
              <h2 className="toolbar-title">Printable Classroom Worksheet</h2>
              <p className="toolbar-sub">A4 Ready-to-print activity sheet with QR audio link for Jharkhand teachers</p>
            </div>
          </div>
          <div className="toolbar-actions">
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

        {/* Structured Printable A4 Sheet Document */}
        <article className="worksheet-document">
          {/* Header Banner */}
          <header className="ws-header">
            <div className="ws-brand-cluster">
              <div className="ws-logo">बो</div>
              <div className="ws-title-group">
                <h1 className="ws-main-title">BOLI — Multilingual Classroom Worksheet</h1>
                <p className="ws-tagline">
                  Primary Mother-Tongue Learning & Bridge Pedagogy Aid · Jharkhand Multilingual Education
                </p>
              </div>
            </div>
            <div className="ws-meta-pills">
              <span className="ws-grade-badge">Class {grade}</span>
              <span className="ws-sih-badge">SIH26042</span>
            </div>
          </header>

          {/* Student Info Bar */}
          <div className="ws-student-bar">
            <div className="ws-field ws-field--name">
              <span className="ws-label">Student Name:</span>
              <span className="ws-line"></span>
            </div>
            <div className="ws-field ws-field--roll">
              <span className="ws-label">Roll No:</span>
              <span className="ws-line"></span>
            </div>
            <div className="ws-field ws-field--date">
              <span className="ws-label">Date:</span>
              <span className="ws-line"></span>
            </div>
          </div>

          {/* Section 1: Original Hindi Lesson */}
          <section className="ws-section">
            <div className="ws-section-header">
              <span className="ws-step-num">1</span>
              <div>
                <h2 className="ws-section-title">Original Textbook Lesson (पाठ्यपुस्तक पाठ)</h2>
                <p className="ws-section-desc">Standard state curriculum source text</p>
              </div>
            </div>
            <div className="ws-card ws-card--hindi" lang="hi">
              <p className="ws-hindi-original-text">{hindiText}</p>
            </div>
          </section>

          {/* Section 2: Classroom Simplified & Culturally Adapted Hindi */}
          {adapted && (
            <section className="ws-section">
              <div className="ws-section-header">
                <span className="ws-step-num">2</span>
                <div className="ws-header-with-tag">
                  <h2 className="ws-section-title">Classroom Simplified Hindi (आसान हिंदी)</h2>
                  {adapted.concept && (
                    <span className="ws-concept-pill">
                      <span className="material-symbols-outlined ws-inline-icon">school</span>
                      Concept: {adapted.concept}
                    </span>
                  )}
                </div>
              </div>

              <div className="ws-card ws-card--simplified">
                <ol className="ws-simplified-list" lang="hi">
                  {adapted.adapted_hindi?.map((sent, idx) => (
                    <li key={idx} className="ws-sentence-item">
                      <span className="ws-sentence-bullet">{idx + 1}</span>
                      <span className="ws-sentence-text">{sent}</span>
                    </li>
                  ))}
                </ol>

                {adapted.substitutions?.length > 0 && (
                  <div className="ws-substitutions-panel">
                    <div className="ws-subs-title">
                      <span className="material-symbols-outlined ws-inline-icon">local_florist</span>
                      <span>Cultural Vocabulary Adaptations (स्थानीय भाषा अनुकूलन):</span>
                    </div>
                    <div className="ws-subs-grid">
                      {adapted.substitutions.map((sub, idx) => (
                        <div key={idx} className="ws-sub-chip">
                          <span className="ws-sub-from">{sub.from}</span>
                          <span className="ws-sub-arrow">→</span>
                          <strong className="ws-sub-to">{sub.to}</strong>
                          <span className="ws-sub-why">({sub.why})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 3: Structured Mother-Tongue Translations */}
          <section className="ws-section">
            <div className="ws-section-header">
              <span className="ws-step-num">3</span>
              <div>
                <h2 className="ws-section-title">Mother-Tongue Classroom Translations (मातृभाषा रूपांतरण)</h2>
                <p className="ws-section-desc">Regional tribal and local language adaptations with native script display</p>
              </div>
            </div>

            <div className="ws-languages-grid">
              {displayLangs.map((item, idx) => (
                <div key={idx} className={`ws-lang-card ws-lang-${item.code}`}>
                  <div className="ws-lang-header">
                    <div className="ws-lang-titles">
                      <span className="ws-lang-name">{item.name}</span>
                      {item.native && <span className="ws-lang-native">{item.native}</span>}
                    </div>
                    <div className="ws-lang-tags">
                      <span className="ws-script-pill">{item.script}</span>
                      <span className="ws-engine-pill">{item.type}</span>
                    </div>
                  </div>
                  <div className="ws-lang-body" lang={item.code}>
                    <p className={`ws-translated-text ${item.code === "sat" ? "ws-ol-chiki-text" : ""}`}>
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer with QR Audio Code & Pedagogical Instructions */}
          <footer className="ws-footer">
            <div className="ws-qr-panel">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan to listen to spoken lesson audio in mother-tongues"
                  className="ws-qr-image"
                />
              ) : (
                <div className="ws-qr-placeholder">QR Code</div>
              )}
              <div className="ws-qr-text-block">
                <div className="ws-qr-headline">
                  <span className="material-symbols-outlined ws-inline-icon">volume_up</span>
                  <strong>Scan with Smartphone Camera to Play Audio</strong>
                </div>
                <p className="ws-qr-details">
                  Teachers and students can instantly hear fluent spoken pronunciation in Santali, Ho, Mundari, Kurukh, and Sadri directly in the classroom without internet lookup.
                </p>
              </div>
            </div>

            <div className="ws-footer-attribution">
              <div className="ws-project-info">
                <strong>BOLI (बोली)</strong> · Smart India Hackathon Prototype (SIH26042)
              </div>
              <div className="ws-mission-statement">
                Empowering Multilingual Primary Classrooms in Jharkhand · Bridging Mother-Tongues to State Curriculum
              </div>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
