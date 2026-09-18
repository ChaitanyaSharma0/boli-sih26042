import { useEffect, useState } from "react";
import { languages as fetchLanguages } from "../api";
import { capabilityBadge, describeCapability } from "../capability";

// Background on each language. Only facts about the language live here;
// what BOLI can do with it comes from GET /languages (RULES.md §5), so this
// page cannot claim a translation model or a voice the backend doesn't have.
const LANGUAGE_FACTS = [
  {
    code: "sat",
    name: "Santali",
    native: "ᱥᱟᱱᱛᱟᱲᱤ",
    script: "Ol Chiki (ᱚᱞ ᱪᱤᱠᱤ)",
    region: "Santhal Parganas (Dumka, Deoghar, Godda, Sahibganj, Pakur, Jamtara)",
    speakers: "~7.6 Million speakers across Eastern India",
    about: "Austroasiatic (North Munda). The only one of the five with an open translation model: AI4Bharat IndicTrans2, into Ol Chiki.",
  },
  {
    code: "hoc",
    name: "Ho",
    native: "हो",
    script: "Warang Citi / Devanagari / Odia (BOLI's phrases use Odia)",
    region: "Kolhan Division (West Singhbhum, East Singhbhum, Seraikela Kharsawan)",
    speakers: "~1.4 Million speakers in Jharkhand & Odisha",
    about: "Austroasiatic (North Munda). No parallel corpus or translation model exists, from BOLI or anyone else.",
  },
  {
    code: "unr",
    name: "Mundari",
    native: "मुंडारी",
    script: "Mundari Bani / Devanagari / Odia (BOLI's phrases use Odia)",
    region: "South Chotanagpur (Ranchi, Khunti, Gumla, Simdega)",
    speakers: "~1.1 Million speakers across Jharkhand",
    about: "Austroasiatic (North Munda), closely related to Ho. No parallel corpus or translation model exists.",
  },
  {
    code: "kru",
    name: "Kurukh",
    native: "कुड़ुख़",
    script: "Tolong Siki / Devanagari",
    region: "Chotanagpur Plateau (Lohardaga, Gumla, Latehar, Ranchi)",
    speakers: "~2 Million speakers in Jharkhand, Chhattisgarh",
    about: "Dravidian, spoken by the Oraon community. No checked translation model is available to BOLI.",
  },
  {
    code: "sck",
    name: "Sadri",
    native: "सादरी",
    script: "Devanagari (देवनागरी)",
    region: "Widespread lingua franca across rural Jharkhand",
    speakers: "~5+ Million speakers as mother tongue or inter-tribal link language",
    about: "Indo-Aryan link language across Jharkhand's communities. No parallel corpus or translation model exists.",
  },
];

export default function LanguagesSection() {
  const [capabilities, setCapabilities] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchLanguages()
      .then((rows) => {
        if (!cancelled) setCapabilities(rows);
      })
      .catch(() => {
        // Facts still render; capability rows simply stay hidden.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="languages-breakdown-section" id="languages-section">
      <div className="section-eyebrow">
        <span className="eyebrow-tag">LINGUISTIC DIVERSITY</span>
        <span>झारखण्ड की भाषाएँ · WHAT IS REAL</span>
      </div>
      <h2 className="screen-title">Languages of Jharkhand in Boli</h2>
      <p className="screen-subtitle">
        Santali is really translated, and has no voice yet. Ho, Mundari, Kurukh and Sadri have no translation model anywhere, so BOLI speaks a small curated phrase bank in them instead, pending validation by a native speaker.
      </p>

      <div className="languages-cards-grid">
        {LANGUAGE_FACTS.map((lang) => {
          const cap = capabilities.find((c) => c.code === lang.code);
          return (
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

            {/* Capability comes from GET /languages, never from this file. */}
            {cap && (
              <div className="lang-capabilities-box">
                <div className="cap-row">
                  <span className="cap-tag-label">Text Translation:</span>
                  <span className={`cap-badge ${cap.translation === "full" ? "badge-ai" : "badge-bank"}`}>
                    {capabilityBadge(cap)}
                  </span>
                </div>
                <div className="cap-row">
                  <span className="cap-tag-label">Voice / Speech:</span>
                  <span className={`cap-badge ${cap.tts === "full" ? "badge-voice" : "badge-none"}`}>
                    {cap.tts === "full" ? "Meta MMS voice" : "No voice exists yet"}
                  </span>
                </div>
              </div>
            )}

            <p className="lang-description-text">
              {cap ? describeCapability(cap) : lang.about}
            </p>
            {cap && <p className="lang-description-text">{lang.about}</p>}
          </div>
          );
        })}
      </div>
    </section>
  );
}
