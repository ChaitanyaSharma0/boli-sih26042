import { useState } from "react";

const SERVICE_NOTICES = [
  {
    id: "edu-1",
    category: "Primary Education (प्राथमिक शिक्षा)",
    icon: "school",
    title: "JCERT कक्षा १–५ निःशुल्क पाठ्यपुस्तक वितरण",
    dept: "स्कूली शिक्षा एवं साक्षरता विभाग, झारखण्ड",
    hindi: "सभी प्राथमिक विद्यालयों में कक्षा 1 से 5 तक के बच्चों को मातृभाषा समर्थित नई पाठ्यपुस्तकें और अभ्यास पुस्तिकाएं निःशुल्क वितरित की जा रही हैं।",
    santali: "ᱥᱟᱱᱟᱢ ᱯᱨᱟᱭᱢᱟᱨᱤ ᱟᱥᱲᱟ ᱨᱮ ᱠᱟᱹᱠᱷᱟ ᱑ ᱠᱷᱚᱱ ᱕ ᱦᱟᱹᱵᱤᱡ ᱜᱤᱫᱽᱨᱟᱹ ᱠᱚ ᱞᱟᱹᱜᱤᱫ ᱯᱚᱛᱚᱵ ᱟᱨ ᱠᱟᱹᱢᱤ ᱯᱚᱛᱚᱵ ᱯᱷᱨᱤ ᱛᱮ ᱦᱟᱹᱴᱤᱧᱚᱜ ᱠᱟᱱᱟ᱾",
    ho: "ᱥᱟᱱᱟᱢ ᱤᱥᱠᱩᱞ ᱨᱮ ᱜᱤᱫᱽᱨᱟᱹ ᱠᱚ ᱞᱟᱹᱜᱤᱫ ᱯᱚᱛᱚᱵ ᱮᱢ ᱦᱩᱭᱩᱜ ᱠᱟᱱᱟ᱾",
    mundari: "सबिन प्राथमिक स्कूल रे गीदरा को लागी पुथी फ्री ते हाटींग हुयुः ताना।",
  },
  {
    id: "health-1",
    category: "Health & Anganwadi (स्वास्थ्य एवं पोषण)",
    icon: "health_and_safety",
    title: "मिशन इंद्रधनुष: बाल एवं मातृ टीकाकरण शिविर",
    dept: "स्वास्थ्य, चिकित्सा शिक्षा एवं परिवार कल्याण विभाग",
    hindi: "बुधवार को ग्राम स्तर पर सभी 0 से 5 वर्ष के बच्चों को नियमित टीकाकरण एवं आयरन-फोलिक एसिड ड्रॉप्स आंगनवाड़ी केंद्र में दी जाएंगी।",
    santali: "ᱵᱩᱫᱷᱵᱟᱨ ᱦᱤᱞᱚᱜ ᱐ ᱠᱷᱚᱱ ᱕ ᱥᱮᱨᱢᱟ ᱜᱤᱫᱽᱨᱟᱹ ᱠᱚ ᱞᱟᱹᱜᱤᱫ ᱟᱝᱜᱚᱱᱵᱟᱲᱤ ᱠᱮᱱᱫᱨᱚ ᱨᱮ ᱴᱤᱠᱟᱹ ᱮᱢ ᱦᱩᱭᱩᱜ-ᱟ᱾",
    ho: "ᱜᱤᱫᱽᱨᱟᱹ ᱠᱚ ᱞᱟᱹᱜᱤᱫ ᱴᱤᱠᱟᱹ ᱟᱝᱜᱚᱱᱵᱟᱲᱤ ᱨᱮ ᱮᱢ ᱦᱩᱭᱩᱜ-ᱟ᱾",
    mundari: "बुधवार को आंगनबाड़ी केंद्र रे सबिन गीदरा को ठीका लगाओ हुयुःआ।",
  },
  {
    id: "agri-1",
    category: "Rural Welfare & Agriculture (ग्रामीण कल्याण)",
    icon: "agriculture",
    title: "बिरसा हरित ग्राम योजना: फलदार बागवानी अनुदान",
    dept: "ग्रामीण विकास विभाग, झारखण्ड सरकार",
    hindi: "प्रत्येक ग्राम पंचायत में इच्छुक किसानों को आम और अमरूद के 100 फलदार पौधे और ड्रिप सिंचाई उपकरण शत-प्रतिशत सरकारी अनुदान पर दिए जा रहे हैं।",
    santali: "ᱡᱚᱛᱚ ᱯᱚᱧᱪᱟᱭᱚᱛ ᱨᱮ ᱪᱟᱹᱥᱤ ᱠᱚ ᱞᱟᱹᱜᱤᱫ ᱩᱞ ᱟᱨ ᱟᱢᱨᱩᱫ ᱫᱟᱨᱮ ᱥᱚᱨᱠᱟᱨᱤ ᱜᱚᱲᱚ ᱛᱮ ᱧᱟᱢᱚᱜ-ᱟ᱾",
    ho: "ᱪᱟᱹᱥᱤ ᱠᱚ ᱞᱟᱹᱜᱤᱫ ᱩᱞ ᱫᱟᱨᱮ ᱮᱢ ᱦᱩᱭᱩᱜ ᱠᱟᱱᱟ᱾",
    mundari: "पंचायत रे सबिन होड़ो को लागी उली दारे हाटींग हुयुः ताना।",
  },
  {
    id: "cert-1",
    category: "JharSewa Services (झारसेवा नागरिक प्रमाण पत्र)",
    icon: "badge",
    title: "प्रज्ञा केंद्र विशेष शिविर: जाति व आवासीय प्रमाण पत्र",
    dept: "कार्मिक, प्रशासनिक सुधार एवं राजभाषा विभाग",
    hindi: "छात्रवृत्ति हेतु आवश्यक जाति, आय एवं आवासीय प्रमाण पत्र के लिए ग्राम पंचायत भवन में विशेष कैंप आयोजित किया जाएगा।",
    santali: "ᱥᱠᱚᱞᱟᱨᱥᱤᱯ ᱞᱟᱹᱜᱤᱫ ᱡᱟᱹᱛᱤ ᱟᱨ ᱚᱲᱟᱜ ᱥᱟᱨᱴᱤᱯᱷᱤᱠᱮᱴ ᱞᱟᱹᱜᱤᱫ ᱯᱚᱧᱪᱟᱭᱚᱛ ᱨᱮ ᱠᱮᱢᱯ ᱞᱟᱜᱟᱣᱜ-ᱟ᱾",
    ho: "ᱡᱟᱹᱛᱤ ᱥᱟᱨᱴᱤᱯᱷᱤᱠᱮᱴ ᱞᱟᱹᱜᱤᱫ ᱯᱚᱧᱪᱟᱭᱚᱛ ᱨᱮ ᱠᱮᱢᱯ ᱦᱩᱭᱩᱜ-ᱟ᱾",
    mundari: "छात्रवृत्ति लागी जाति प्रमाण पत्र पंचायत भवन रे बनाओ हुयुःआ।",
  },
];

export default function PublicServicesSection({ onLoadIntoStudio }) {
  const [selectedNotice, setSelectedNotice] = useState(SERVICE_NOTICES[0]);
  const [selectedDialect, setSelectedDialect] = useState("santali");

  return (
    <section className="public-services-section" id="services-section">
      <div className="section-eyebrow">
        <span className="eyebrow-tag">PUBLIC SERVICE ACCESSIBILITY</span>
        <span>झारखण्ड जन-सेवा सूचना अनुवाद · PROPOSED SOLUTION</span>
      </div>
      <h2 className="screen-title">Access Public & School Services in Your Language</h2>
      <p className="screen-subtitle">
        Bridging the communication divide so parents, students, and citizens in tribal areas can comprehend official government notices and school schemes without language barriers.
      </p>

      <div className="services-grid-wrapper">
        {/* Notice Cards on the left */}
        <div className="services-list-column">
          {SERVICE_NOTICES.map((notice) => (
            <button
              key={notice.id}
              type="button"
              className={`service-notice-card ${selectedNotice.id === notice.id ? "is-selected" : ""}`}
              onClick={() => setSelectedNotice(notice)}
            >
              <div className="notice-icon-box">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {notice.icon}
                </span>
              </div>
              <div className="notice-meta-box">
                <span className="notice-dept-tag">{notice.dept}</span>
                <h3 className="notice-title">{notice.title}</h3>
                <span className="notice-category">{notice.category}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Translation Panel on the right */}
        <div className="service-preview-panel sun-card-shadow">
          <div className="preview-top-bar">
            <div className="preview-heading-stack">
              <span className="preview-badge">Official Notice · नागरिक सूचना</span>
              <h3 className="preview-title">{selectedNotice.title}</h3>
              <p className="preview-dept">{selectedNotice.dept}</p>
            </div>

            {/* Dialect Selector */}
            <div className="preview-dialect-selector">
              <label htmlFor="service-dialect-select" className="dialect-label">Target Mother Tongue:</label>
              <select
                id="service-dialect-select"
                value={selectedDialect}
                onChange={(e) => setSelectedDialect(e.target.value)}
                className="dialect-select-input"
              >
                <option value="santali">Santali (Ol Chiki ᱥᱟᱱᱛᱟᱲᱤ)</option>
                <option value="ho">Ho (Warang Chiti 𑢹𑣉 ᱡᱟᱜᱟᱨ)</option>
                <option value="mundari">Mundari (मुंडारी)</option>
              </select>
            </div>
          </div>

          <div className="preview-content-split">
            {/* Hindi Original */}
            <div className="preview-source-box">
              <div className="box-tag">मूल हिंदी सूचना (Original Notice)</div>
              <p className="preview-text-hindi">{selectedNotice.hindi}</p>
            </div>

            {/* Native Mother Tongue Translation */}
            <div className="preview-target-box">
              <div className="box-tag box-tag-target">
                मातृभाषा अनुवाद ({selectedDialect === "santali" ? "Santali ᱥᱟᱱᱛᱟᱲᱤ" : selectedDialect === "ho" ? "Ho 𑢹𑣉" : "Mundari मुंडारी"})
              </div>
              <p className="preview-text-native">
                {selectedDialect === "santali"
                  ? selectedNotice.santali
                  : selectedDialect === "ho"
                  ? selectedNotice.ho
                  : selectedNotice.mundari}
              </p>
            </div>
          </div>

          <div className="preview-actions-bar">
            <button
              type="button"
              className="button button--primary tactile-btn-primary"
              onClick={() => onLoadIntoStudio && onLoadIntoStudio(selectedNotice.hindi)}
            >
              <span className="material-symbols-outlined text-base">record_voice_over</span>
              <span>Open in Boli Lesson Studio</span>
            </button>
            <span className="preview-hint">
              Loads this official notification into the teacher synthesizer to generate spoken audio for classroom announcements.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
