export default function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Input via Voice, Photo, or Text",
      hindiTitle: "आवाज़, फ़ोटो या टेक्स्ट इनपुट",
      desc: "Teachers or citizens can dictate in Hindi via Meta MMS ASR, snap a photo of textbook pages with Tesseract OCR, or paste official government circulars.",
      icon: "mic",
    },
    {
      num: "02",
      title: "Pedagogical & Dialect Adaptation",
      hindiTitle: "कक्षा अनुरूप भाषा सरलीकरण",
      desc: "The system adjusts sentence structures and pauses to the selected primary grade (Class 1–5), removing complex jargon before translation.",
      icon: "tune",
    },
    {
      num: "03",
      title: "Translation Where It Is Real",
      hindiTitle: "न्यूरल अनुवाद व लिपि मैपिंग",
      desc: "Santali is translated using AI4Bharat IndicTrans2 into Ol Chiki script. Ho, Mundari, Kurukh and Sadri have no translation model anywhere, so BOLI plays a small curated phrase bank instead — pending validation by a native speaker.",
      icon: "translate",
    },
    {
      num: "04",
      title: "Spoken Audio & Offline Sync",
      hindiTitle: "मातृभाषा में ध्वनि उच्चारण",
      desc: "Meta MMS voices speak the phrase-bank phrases in Ho, Mundari, Kurukh and Sadri. Santali has no voice yet, so it stays text only. Lessons can be downloaded as offline zip bundles for schools without internet.",
      icon: "volume_up",
    },
  ];

  const techCards = [
    {
      title: "Meta MMS Speech Engine",
      tag: "ASR & TTS",
      desc: "Massively Multilingual Speech architecture for low-resource Indian languages, enabling speech-to-text and speech synthesis.",
    },
    {
      title: "AI4Bharat IndicTrans2",
      tag: "Machine Translation",
      desc: "Transformer translation model covering Santali (sat_Olck). It can put a word it does not know into the wrong script, and BOLI flags that on screen.",
    },
    {
      title: "JCERT Pedagogical Logic",
      tag: "Curriculum Alignment",
      desc: "Designed to match Jharkhand Council of Educational Research and Training primary standards for Class 1 to 5.",
    },
    {
      title: "Offline-First Web Audio",
      tag: "Edge Resilience",
      desc: "PWA caching, client-side Web Audio API chime tests, and zip bundle generator ensuring full reliability in zero-connectivity rural classrooms.",
    },
  ];

  return (
    <section className="how-it-works-section" id="how-it-works">
      <div className="section-eyebrow">
        <span className="eyebrow-tag">WORKFLOW & ARCHITECTURE</span>
        <span>प्रणाली कार्यप्रणाली · HOW BOLI OPERATES</span>
      </div>
      <h2 className="screen-title">How Boli Bridges Communication</h2>
      <p className="screen-subtitle">
        A 4-step pipeline designed specifically for low-connectivity government schools and rural public service delivery.
      </p>

      {/* 4 Steps Grid */}
      <div className="how-steps-grid">
        {steps.map((s) => (
          <div key={s.num} className="step-card sun-card-shadow">
            <div className="step-card-header">
              <span className="step-number-tag">{s.num}</span>
              <span className="material-symbols-outlined step-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                {s.icon}
              </span>
            </div>
            <h3 className="step-title">{s.title}</h3>
            <span className="step-hindi-title">{s.hindiTitle}</span>
            <p className="step-desc">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Technology Section (Prompt Section 19) */}
      <div className="tech-architecture-container" id="technology-section">
        <div className="tech-header-row">
          <div>
            <span className="tech-badge">TECHNICAL INTEGRITY · SIH26042</span>
            <h3 className="tech-heading">Built for Accessible Multilingual Public Services</h3>
          </div>
          <p className="tech-intro">
            Built on open models, with each language's real capability shown on screen: translation only where a model exists, speech only where a voice exists.
          </p>
        </div>

        <div className="tech-cards-grid">
          {techCards.map((c) => (
            <div key={c.title} className="tech-card">
              <div className="tech-card-top">
                <h4 className="tech-title">{c.title}</h4>
                <span className="tech-tag">{c.tag}</span>
              </div>
              <p className="tech-desc">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
