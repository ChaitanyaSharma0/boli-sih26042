import { useState } from "react";
import { speak } from "../api";
import AudioPlayer from "./AudioPlayer";

// Primary FLN (Foundational Literacy & Numeracy) Bilingual Flashcards
// Designed for Jharkhand primary classrooms (Classes 1–3)
const FOUNDATION_CARDS = [
  {
    id: "water",
    category: "प्रकृति (Nature)",
    icon: "water_drop",
    color: "#0288D1",
    hindi: "जल / पानी",
    meaning: "Water — जीवन का आधार",
    dialects: {
      sat: {
        script: "ᱫᱟᱜ",
        translit: "Daag",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱫᱟᱜ",
        translit: "Daa",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "ᱫᱟᱻ",
        translit: "Da:",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "अम्म",
        translit: "Amm",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "पानी",
        translit: "Paani",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "कुएं का पानी साफ है। (ᱫᱟᱜ ᱥᱟᱯᱷᱟ ᱜᱮᱭᱟ)",
  },
  {
    id: "tree",
    category: "प्रकृति (Nature)",
    icon: "park",
    color: "#2E7D32",
    hindi: "पेड़ / वृक्ष",
    meaning: "Tree — सखुआ और महुआ के पेड़",
    dialects: {
      sat: {
        script: "ᱫᱟᱨᱮ",
        translit: "Dare",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱫᱟᱨᱩ",
        translit: "Daru",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "दारु",
        translit: "Daaru",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "मन्न",
        translit: "Mann",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "गाछ",
        translit: "Gaachh",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "जंगल में बड़े पेड़ हैं। (ᱵᱤᱨ ᱨᱮ ᱢᱟᱨᱟᱝ ᱫᱟᱨᱮ ᱢᱮᱱᱟᱜᱼᱟ)",
  },
  {
    id: "sun",
    category: "प्रकृति (Nature)",
    icon: "wb_sunny",
    color: "#F57C00",
    hindi: "सूरज / सूर्य",
    meaning: "Sun — सुबह की धूप",
    dialects: {
      sat: {
        script: "ᱥᱤᱧ / ᱵᱮᱲᱟ",
        translit: "Sin / Beda",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱥᱤᱝᱜᱤ",
        translit: "Singi",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "सिंगी",
        translit: "Singi",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "बीड़ी",
        translit: "Bidi",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "सुरुज",
        translit: "Suruj",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "पूरब से सूरज निकला। (ᱥᱤᱧ ᱪᱟᱸᱫᱚ ᱨᱟᱠᱟᱵ ᱮᱱᱟ)",
  },
  {
    id: "mother",
    category: "परिवार (Family)",
    icon: "family_restroom",
    color: "#C2185B",
    hindi: "माँ / माता",
    meaning: "Mother — स्नेह और दुलार",
    dialects: {
      sat: {
        script: "ᱟᱭᱳ / ᱮᱸᱜᱟᱛ",
        translit: "Ayo / Engat",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱮᱸᱜᱟ",
        translit: "Enga",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "एंगा",
        translit: "Enga",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "अयो",
        translit: "Ayo",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "माय",
        translit: "Maay",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "माँ मुझे खाना खिलाती है। (ᱟᱭᱳ ᱤᱧ ᱫᱟᱠᱟᱭ ᱮᱢᱟᱹᱧ ᱠᱟᱱᱟ)",
  },
  {
    id: "friend",
    category: "मित्रता (Friendship)",
    icon: "diversity_1",
    color: "#7B1FA2",
    hindi: "दोस्त / सखा",
    meaning: "Friend — कक्षा में साथी",
    dialects: {
      sat: {
        script: "ᱜᱟᱛᱮ",
        translit: "Gate",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱜᱟᱛᱮ",
        translit: "Gate",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "गाते",
        translit: "Gate",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "संगी",
        translit: "Sangi",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "संगी / जोहारिया",
        translit: "Sangi",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "हम सब अच्छे दोस्त हैं। (ᱟᱞᱮ ᱵᱮᱥ ᱜᱟᱛᱮ ᱠᱟᱱᱟᱞᱮ)",
  },
  {
    id: "school",
    category: "विद्यालय (School)",
    icon: "school",
    color: "#E65100",
    hindi: "विद्यालय / स्कूल",
    meaning: "School — ज्ञान का घर",
    dialects: {
      sat: {
        script: "ᱟᱥᱲᱟ",
        translit: "Asda",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱤᱛᱩᱱ ᱟᱥᱲᱟ",
        translit: "Itun Asda",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "इतुन आसड़ा",
        translit: "Itun Asda",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "पढ़ना गढ़ी",
        translit: "Padhna Gadhi",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "इस्कूल",
        translit: "Iskool",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "बच्चे रोज स्कूल जाते हैं। (ᱜᱤᱫᱽᱨᱟᱹ ᱫᱤᱱᱟᱹᱢ ᱟᱥᱲᱟ ᱠᱚ ᱥᱮᱱᱚᱜᱼᱟ)",
  },
  {
    id: "book",
    category: "विद्यालय (School)",
    icon: "menu_book",
    color: "#1565C0",
    hindi: "किताब / पुस्तक",
    meaning: "Book — सुंदर कहानियाँ",
    dialects: {
      sat: {
        script: "ᱯᱩᱛᱷᱤ",
        translit: "Puthi",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱯᱩᱛᱷᱤ",
        translit: "Puthi",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "पुथी",
        translit: "Puthi",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "बिजा",
        translit: "Bija",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "किताब / पोथी",
        translit: "Pothi",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "यह मेरी हिंदी की किताब है। (ᱱᱚᱣᱟ ᱤᱧᱟᱜ ᱯᱩᱛᱷᱤ ᱠᱟᱱᱟ)",
  },
  {
    id: "bird",
    category: "प्रकृति (Nature)",
    icon: "cruelty_free",
    color: "#00796B",
    hindi: "चिड़िया / पक्षी",
    meaning: "Bird — मीठी बोली",
    dialects: {
      sat: {
        script: "ᱪᱮᱸᱬᱮ",
        translit: "Chende",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱪᱮᱸᱬᱮ",
        translit: "Chende",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "चेड़े",
        translit: "Chede",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "ओड़ा",
        translit: "Oda",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "चिरई",
        translit: "Chirai",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "पेड़ पर सुंदर चिड़िया बैठी है। (ᱫᱟᱨᱮ ᱨᱮ ᱪᱮᱸᱬᱮ ᱢᱮᱱᱟᱭᱟ)",
  },
];

export default function Flashcards({ lessonText, currentGrade = 2 }) {
  const [selectedDialect, setSelectedDialect] = useState("sat");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [activeAudioBlob, setActiveAudioBlob] = useState(null);
  const [audioError, setAudioError] = useState("");

  const card = FOUNDATION_CARDS[activeCardIndex];
  const dialectInfo = card.dialects[selectedDialect] || card.dialects.sat;

  async function handlePlayCardAudio() {
    setAudioLoading(true);
    setAudioError("");
    setActiveAudioBlob(null);

    try {
      // If Santali, speak the Ol Chiki target script
      const textToSpeak = selectedDialect === "sat"
        ? dialectInfo.script
        : card.hindi; // Phrase bank checks Hindi source
      const res = await speak(textToSpeak, selectedDialect);
      if (res.kind === "audio") {
        setActiveAudioBlob(res.blob);
      } else if (res.kind === "phrase_bank_only") {
        setAudioError(res.reason || "Phrase bank audio unavailable for single word.");
      }
    } catch (err) {
      setAudioError("Audio error: " + err.message);
    } finally {
      setAudioLoading(false);
    }
  }

  function handleNext() {
    setIsFlipped(false);
    setActiveAudioBlob(null);
    setAudioError("");
    setActiveCardIndex((prev) => (prev + 1) % FOUNDATION_CARDS.length);
  }

  function handlePrev() {
    setIsFlipped(false);
    setActiveAudioBlob(null);
    setAudioError("");
    setActiveCardIndex((prev) => (prev - 1 + FOUNDATION_CARDS.length) % FOUNDATION_CARDS.length);
  }

  return (
    <section className="flashcards-section" aria-labelledby="flashcards-heading">
      <div className="section-eyebrow">
        <span className="eyebrow-tag">कक्षा १–३ बाल-वाटिका</span>
        <span>दृश्य शिक्षण · सचित्र द्विभाषी शब्द-पत्ती (Visual Flashcards)</span>
      </div>
      <h1 id="flashcards-heading" className="screen-title">
        Visual Bilingual Flashcards <span lang="hi">(सचित्र शब्द-पत्ती)</span>
      </h1>
      <p className="screen-subtitle">
        Foundational Vocabulary in Authentic Mother-Tongue Scripts for Classroom Drills and Early Readers.
      </p>

      {/* Dialect Selector Bar */}
      <div className="flashcards-toolbar">
        <div className="dialect-pills-bar" role="tablist" aria-label="Select Target Dialect">
          {[
            { code: "sat", name: "Santali (Ol Chiki ᱥᱟᱱᱛᱟᱲᱤ)" },
            { code: "hoc", name: "Ho (ᱦᱳ ᱡᱟᱜᱟᱨ)" },
            { code: "unr", name: "Mundari (मुंडारी)" },
            { code: "kru", name: "Kurukh (कुड़ुख़)" },
            { code: "sck", name: "Sadri (नागपुरी)" },
          ].map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="tab"
              aria-selected={selectedDialect === lang.code}
              className={`dialect-pill-btn ${selectedDialect === lang.code ? "active" : ""}`}
              onClick={() => {
                setSelectedDialect(lang.code);
                setActiveAudioBlob(null);
                setAudioError("");
              }}
            >
              {lang.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="button button--secondary tactile-btn-secondary"
          onClick={() => window.print()}
          title="Print flashcards for classroom circle drill"
        >
          <span className="material-symbols-outlined text-base">print</span>
          <span>Print Cards</span>
        </button>
      </div>

      {/* Main Interactive Flashcard Display */}
      <div className="flashcard-stage-container">
        <div
          className={`interactive-flashcard-wrap ${isFlipped ? "flipped" : ""}`}
          onClick={() => setIsFlipped(!isFlipped)}
          role="button"
          tabIndex={0}
          aria-label={`Flashcard ${card.hindi}. Click to flip.`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsFlipped(!isFlipped);
            }
          }}
        >
          <div className="flashcard-inner">
            {/* FRONT OF CARD (Hindi + Visual Icon) */}
            <div className="flashcard-face flashcard-front" style={{ borderColor: card.color }}>
              <div className="card-top-meta">
                <span className="card-cat-badge" style={{ backgroundColor: `${card.color}18`, color: card.color }}>
                  {card.category}
                </span>
                <span className="flip-hint">
                  <span className="material-symbols-outlined text-xs">sync</span>
                  <span>क्लिक करके पलटें (Click to Flip)</span>
                </span>
              </div>

              <div className="card-visual-circle" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                <span className="material-symbols-outlined card-big-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {card.icon}
                </span>
              </div>

              <div className="card-hindi-block">
                <h2 className="card-hindi-word" lang="hi">{card.hindi}</h2>
                <p className="card-meaning-sub">{card.meaning}</p>
              </div>

              <div className="card-bottom-footer">
                <span className="card-class-tag">Class {currentGrade} Vocabulary</span>
                <span className="card-index-count">
                  {activeCardIndex + 1} / {FOUNDATION_CARDS.length}
                </span>
              </div>
            </div>

            {/* BACK OF CARD (Mother-Tongue Native Script + Audio) */}
            <div className="flashcard-face flashcard-back" style={{ borderColor: card.color }}>
              <div className="card-top-meta">
                <span className="card-cat-badge" style={{ backgroundColor: `${card.color}18`, color: card.color }}>
                  {dialectInfo.langName}
                </span>
                <span className="flip-hint">
                  <span className="material-symbols-outlined text-xs">sync</span>
                  <span>वापस पलटें (Flip Back)</span>
                </span>
              </div>

              <div className="card-mother-tongue-block">
                <span className="script-badge-small">मूल लिपि (Native Script):</span>
                <div className="card-native-script" lang={selectedDialect}>
                  {dialectInfo.script}
                </div>
                <div className="card-translit-pronounce">
                  <span>उच्चारण (Phonetics): </span>
                  <strong>{dialectInfo.translit}</strong>
                </div>
              </div>

              <div className="card-sentence-box" lang="hi">
                <span className="sentence-label">कक्षा प्रयोग (Classroom Usage):</span>
                <p className="sentence-text">{card.sampleSentence}</p>
              </div>

              <div className="card-action-bar" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="button button--primary tactile-btn-primary card-audio-btn"
                  onClick={handlePlayCardAudio}
                  disabled={audioLoading}
                >
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    volume_up
                  </span>
                  <span>{audioLoading ? "Generating Speech…" : "बोलकर सुनाएं (Listen Pronunciation)"}</span>
                </button>
              </div>

              {activeAudioBlob && (
                <div className="card-player-embed" onClick={(e) => e.stopPropagation()}>
                  <AudioPlayer blob={activeAudioBlob} label={`${card.hindi} pronunciation`} />
                </div>
              )}

              {audioError && <p className="error text-xs" style={{ margin: "0.25rem 0" }}>{audioError}</p>}
            </div>
          </div>
        </div>

        {/* Carousel Navigation Controls */}
        <div className="flashcard-nav-controls">
          <button
            type="button"
            className="button button--secondary tactile-btn-secondary"
            onClick={handlePrev}
            aria-label="Previous card"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Previous Card</span>
          </button>

          <span className="card-counter-display">
            Card <strong>{activeCardIndex + 1}</strong> of {FOUNDATION_CARDS.length}
          </span>

          <button
            type="button"
            className="button button--primary tactile-btn-primary"
            onClick={handleNext}
            aria-label="Next card"
          >
            <span>Next Card</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Classroom Drill Guide */}
      <div className="flashcard-pedagogy-guide sun-card-shadow">
        <div className="guide-header">
          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            tips_and_updates
          </span>
          <strong>शिक्षक बाल-सखा मार्गदर्शन (Teacher's Circle Drill Routine)</strong>
        </div>
        <ol className="drill-steps-list">
          <li>
            <strong>देखें और पहचानें (Step 1):</strong> कार्ड का अगला भाग दिखाकर बच्चों से हिंदी शब्द और चित्र पहचानने को कहें।
          </li>
          <li>
            <strong>बोली में अनुवाद (Step 2):</strong> कार्ड पलटकर Ol Chiki या स्थानीय लिपि में लिखा शब्द दिखाएं।
          </li>
          <li>
            <strong>ऑडियो उच्चारण (Step 3):</strong> "बोलकर सुनाएं" बटन दबाएं और बच्चों को तीन बार एक साथ दोहराने को कहें (Classroom Chanting)।
          </li>
        </ol>
      </div>
    </section>
  );
}
