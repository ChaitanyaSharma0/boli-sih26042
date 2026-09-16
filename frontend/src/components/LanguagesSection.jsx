export default function LanguagesSection() {
  const languagesData = [
    {
      code: "sat",
      name: "Santali",
      native: "ᱥᱟᱱᱛᱟᱲᱤ",
      script: "Ol Chiki (ᱚᱞ ᱪᱤᱠᱤ)",
      region: "Santhal Parganas (Dumka, Deoghar, Godda, Sahibganj, Pakur, Jamtara)",
      speakers: "~7.6 Million speakers across Eastern India",
      translationStatus: "Neural Machine Translation (AI Model)",
      translationBadge: "AI Neural Model",
      voiceStatus: "Neural Text-to-Speech (AI Model)",
      voiceBadge: "Spoken Voice Ready",
      details:
        "Trained using AI4Bharat IndicTrans2 engine on script-qualified sat_Olck tokens, paired with AI4Bharat Indic Parler-TTS for native Ol Chiki speech synthesis.",
    },
    {
      code: "hoc",
      name: "Ho",
      native: "𑢹𑣉 ᱡᱟᱜᱟᱨ",
      script: "Warang Chiti (𑢹𑣉 ᱪᱤᱛᱤ) / Devanagari",
      region: "Kolhan Division (West Singhbhum, East Singhbhum, Seraikela Kharsawan)",
      speakers: "~1.4 Million speakers in Jharkhand & Odisha",
      translationStatus: "Curated Classroom Phrase Bank",
      translationBadge: "Phrase Bank Only",
      voiceStatus: "Spoken Audio Voice Ready",
      voiceBadge: "Spoken Voice Ready",
      details:
        "Hand-curated pedagogical phrases verified for primary school classrooms. Native pronunciation synthesized via Meta MMS speech engine.",
    },
    {
      code: "unr",
      name: "Mundari",
      native: "मुंडारी",
      script: "Mundari Bani / Devanagari",
      region: "South Chotanagpur (Ranchi, Khunti, Gumla, Simdega)",
      speakers: "~1.1 Million speakers across Jharkhand",
      translationStatus: "Curated Classroom Phrase Bank",
      translationBadge: "Phrase Bank Only",
      voiceStatus: "Spoken Audio Voice Ready",
      voiceBadge: "Spoken Voice Ready",
      details:
        "Austroasiatic Munda family language. Includes pedagogical vocabulary adapted to JCERT primary textbook units with native speech synthesis.",
    },
    {
      code: "kru",
      name: "Kurukh (Oraon)",
      native: "कुड़ुख़",
      script: "Tolong Siki / Devanagari",
      region: "Chotanagpur Plateau (Lohardaga, Gumla, Latehar, Ranchi)",
      speakers: "~2 Million speakers in Jharkhand, Chhattisgarh",
      translationStatus: "Curated Classroom Phrase Bank",
      translationBadge: "Phrase Bank Only",
      voiceStatus: "Spoken Audio Voice Ready",
      voiceBadge: "Spoken Voice Ready",
      details:
        "Dravidian language spoken by the Oraon community. Curated phrase list for primary school concepts and instructions.",
    },
    {
      code: "sck",
      name: "Sadri (Nagpuri)",
      native: "नागपुरी / सादरी",
      script: "Devanagari (देवनागरी)",
      region: "Widespread lingua franca across rural Jharkhand",
      speakers: "~5+ Million speakers as mother tongue or inter-tribal link language",
      translationStatus: "Curated Classroom Phrase Bank",
      translationBadge: "Phrase Bank Only",
      voiceStatus: "Spoken Audio Voice Ready",
      voiceBadge: "Spoken Voice Ready",
      details:
        "Vital link language across diverse tribal communities in Jharkhand. Curated phrase bank enables classroom bridging from local dialects into standardized Hindi.",
    },
  ];

  return (
    <section className="languages-breakdown-section" id="languages-section">
      <div className="section-eyebrow">
        <span className="eyebrow-tag">LINGUISTIC DIVERSITY</span>
        <span>झारखण्ड की भाषाएँ · SCIENTIFIC INTEGRITY</span>
      </div>
      <h2 className="screen-title">Languages of Jharkhand in Boli</h2>
      <p className="screen-subtitle">
        Transparent and honest capability representation. Boli does not exaggerate AI claims: we clearly distinguish between neural translation models and verified phonetic phrase banks.
      </p>

      <div className="languages-cards-grid">
        {languagesData.map((lang) => (
          <div key={lang.code} className="lang-detail-card sun-card-shadow">
            <div className="lang-card-top">
              <div className="lang-title-group">
                <span className="lang-native-script">{lang.native}</span>
                <h3 className="lang-english-name">{lang.name}</h3>
              </div>
              <span className="lang-code-pill">{lang.code.toUpperCase()}</span>
            </div>

            <div className="lang-meta-row">
              <div className="lang-meta-item">
                <span className="meta-label">Primary Script:</span>
                <span className="meta-value">{lang.script}</span>
              </div>
              <div className="lang-meta-item">
                <span className="meta-label">Region:</span>
                <span className="meta-value">{lang.region}</span>
              </div>
              <div className="lang-meta-item">
                <span className="meta-label">Speakers:</span>
                <span className="meta-value">{lang.speakers}</span>
              </div>
            </div>

            <div className="lang-capabilities-box">
              <div className="cap-row">
                <span className="cap-tag-label">Text Translation:</span>
                <span className={`cap-badge ${lang.translationBadge.includes("AI") ? "badge-ai" : "badge-bank"}`}>
                  {lang.translationStatus}
                </span>
              </div>
              <div className="cap-row">
                <span className="cap-tag-label">Voice / Speech:</span>
                <span className={`cap-badge ${lang.voiceBadge.includes("Spoken") ? "badge-voice" : "badge-none"}`}>
                  {lang.voiceStatus}
                </span>
              </div>
            </div>

            <p className="lang-description-text">{lang.details}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
