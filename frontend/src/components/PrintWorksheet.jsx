import {
  capabilityBadge,
  nativeName,
  phraseBankNote,
  phrasesVerified,
} from "../capability";

// A printable sheet for one lesson line.
//
// Every label comes from the API's capability fields via capability.js,
// never from a per-language table here, so the sheet cannot claim more
// than the screen does (RULES.md §5). A phrase-bank language appears only
// if /speak named the phrase it actually spoke (textIsTarget) — the sheet
// never prints the Hindi that was sent as if it were Ho or Kurukh.
export default function PrintWorksheet({
  isOpen,
  onClose,
  hindiText,
  adapted,
  languages = [],
  translations = [],
  audio = {},
  grade = 2,
}) {
  if (!isOpen) return null;

  const bank = languages.filter((l) => l.translation === "phrase_bank");
  const bankChecked = bank.length > 0 && bank.every(phrasesVerified);

  function handlePrint() {
    window.print();
  }

  const items = [];
  for (const language of languages) {
    const mine = translations.filter((t) => t.code === language.code && t.translated);
    const spoken = audio[language.code];
    let text = null;
    if (mine.length) text = mine.map((t) => t.translated).join(" ");
    else if (spoken?.kind === "audio" && spoken.textIsTarget) text = spoken.text;
    if (!text) continue;
    items.push({
      code: language.code,
      name: language.name,
      native: nativeName(language),
      badge: capabilityBadge(language),
      note: language.translation === "phrase_bank" ? phraseBankNote(language) : null,
      text,
    });
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
              <p className="toolbar-sub">A4 ready-to-print activity sheet for Jharkhand teachers</p>
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
                <h2 className="ws-section-title">In the children's languages (मातृभाषा)</h2>
                <p className="ws-section-desc">
                  Santali is translated. Ho, Mundari, Kurukh and Sadri show a phrase from the curated phrase bank, not a translation of this lesson.
                </p>
              </div>
            </div>

            <div className="ws-languages-grid">
              {items.map((item, idx) => (
                <div key={idx} className={`ws-lang-card ws-lang-${item.code}`}>
                  <div className="ws-lang-header">
                    <div className="ws-lang-titles">
                      <span className="ws-lang-name">{item.name}</span>
                      {item.native && <span className="ws-lang-native">{item.native}</span>}
                    </div>
                    <div className="ws-lang-tags">
                      <span className="ws-engine-pill">{item.badge}</span>
                    </div>
                  </div>
                  <div className="ws-lang-body" lang={item.code}>
                    <p className={`ws-translated-text ${item.code === "sat" ? "ws-ol-chiki-text" : ""}`}>
                      {item.text}
                    </p>
                    {item.note && <p className="ws-section-desc">{item.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer: what is real, plus attribution */}
          <footer className="ws-footer">
            <p className="ws-section-desc">
              Santali has no voice anywhere yet, so it is text only.{" "}
              {bank.length > 0 &&
                (bankChecked
                  ? "The phrase-bank phrases were checked by native speakers; they are not translations of this lesson."
                  : "Not every phrase-bank phrase has been checked by a native speaker yet: pending validation.")}
            </p>

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
