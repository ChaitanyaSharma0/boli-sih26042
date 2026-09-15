import { useState } from "react";
import { speak } from "../api";

const PRELOADED_CONVERSATIONS = {
  health: {
    title: "🏥 Primary Health Center (प्राथमिक स्वास्थ्य केंद्र)",
    speakers: {
      a: { name: "कमला मुर्मू (नागरिक / माता)", lang: "Santali (ᱥᱟᱱᱛᱟᱲᱤ)", code: "sat" },
      b: { name: "डॉ. शर्मा (चिकित्सा अधिकारी)", lang: "Hindi (हिन्दी)", code: "hin" },
    },
    messages: [
      {
        id: 1,
        speaker: "a",
        original: "ᱤᱧᱤᱡ ᱜᱤᱫᱽᱨᱟᱹ ᱵᱟᱹᱲᱛᱤ ᱨᱩᱣᱟᱹ ᱢᱮᱱᱟᱜ-ᱟ, ᱴᱤᱠᱟᱹ ᱛᱤᱥ ᱦᱩᱭᱩᱜ-ᱟ?",
        translation: "मेरे बच्चे को तेज़ बुखार है, उसका नियमित टीकाकरण कब होगा?",
        lang: "sat",
      },
      {
        id: 2,
        speaker: "b",
        original: "घबराइए मत। पहले बच्चे को ओआरएस का घोल दें, बुधवार को उप-स्वास्थ्य केंद्र में टीकाकरण होगा।",
        translation: "ᱟᱞᱚᱢ ᱵᱚᱛᱚᱨᱚᱜ-ᱟ, ᱵᱩᱫᱷᱵᱟᱨ ᱦᱤᱞᱚᱜ ᱩᱯ-ᱥᱟᱥᱛᱷᱚ ᱠᱮᱱᱫᱨᱚ ᱨᱮ ᱴᱤᱠᱟᱹ ᱦᱩᱭᱩᱜ-ᱟ᱾",
        lang: "sat",
      },
    ],
  },
  school: {
    title: "🎓 Primary School Admission & Mid-Day Meal (विद्यालय नामांकन)",
    speakers: {
      a: { name: "सोमा हो (अभिभावक)", lang: "Ho (𑢹𑣉 ᱡᱟᱜᱟᱨ)", code: "hoc" },
      b: { name: "प्रधान शिक्षिका (GPS Kanke)", lang: "Hindi (हिन्दी)", code: "hin" },
    },
    messages: [
      {
        id: 1,
        speaker: "a",
        original: "ᱡᱚᱦᱟᱨ ᱢᱮᱰᱟᱢ, ᱤᱧᱤᱡ ᱦᱚᱯᱚᱱ ᱠᱟᱹᱠᱷᱟ ᱑ ᱨᱮ ᱵᱷᱩᱨᱛᱤ ᱦᱩᱭᱩᱜ-ᱟ?",
        translation: "जोहार मैडम, क्या मेरे बेटे का कक्षा 1 में बालवाटिका नामांकन हो सकता है?",
        lang: "hoc",
      },
      {
        id: 2,
        speaker: "b",
        original: "हाँ बिल्कुल! केवल जन्म प्रमाण पत्र या आधार कार्ड लाइए, पुस्तकें और मध्याह्न भोजन निःशुल्क है।",
        translation: "ᱦᱮᱸ ᱛᱚᱵᱮ! ᱯᱚᱛᱚᱵ ᱟᱨ ᱡᱚᱢᱟᱜ ᱥᱟᱱᱟᱢ ᱯᱷᱨᱤ ᱜᱮᱭᱟ᱾",
        lang: "hoc",
      },
    ],
  },
  panchayat: {
    title: "🌾 Gram Panchayat & Kisan Suvidha (ग्राम पंचायत किसान सुविधा)",
    speakers: {
      a: { name: "बिरसा मुंडा (किसान)", lang: "Mundari (मुंडारी)", code: "unr" },
      b: { name: "पंचायत सचिव (Panchayat Sevak)", lang: "Hindi (हिन्दी)", code: "hin" },
    },
    messages: [
      {
        id: 1,
        speaker: "a",
        original: "ᱟᱞᱮ ᱟᱹᱛᱩ ᱨᱮ ᱵᱤᱨᱥᱟᱹ ᱦᱟᱹᱨᱤᱭᱟᱹᱲ ᱜᱽᱨᱟᱢ ᱭᱚᱡᱽᱱᱟ ᱨᱮᱭᱟᱜ ᱫᱟᱨᱮ ᱛᱤᱥ ᱧᱟᱢᱚᱜ-ᱟ?",
        translation: "हमारे गांव में बिरसा हरित ग्राम योजना के फलदार पौधे कब वितरित होंगे?",
        lang: "unr",
      },
      {
        id: 2,
        speaker: "b",
        original: "अगले सोमवार को पंचायत भवन में 100 आम और अमरूद के पौधे वितरित किए जाएंगे।",
        translation: "ᱞᱟᱦᱟᱱᱛᱤ ᱥᱚᱢᱵᱟᱨ ᱦᱤᱞᱚᱜ ᱯᱚᱧᱪᱟᱭᱚᱛ ᱵᱷᱚᱵᱚᱱ ᱨᱮ ᱫᱟᱨᱮ ᱮᱢ ᱦᱩᱭᱩᱜ-ᱟ᱾",
        lang: "unr",
      },
    ],
  },
};

export default function ConversationMode() {
  const [activeScenarioKey, setActiveScenarioKey] = useState("health");
  const [activeSpeaker, setActiveSpeaker] = useState("a");
  const [inputText, setInputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [conversationList, setConversationList] = useState(
    PRELOADED_CONVERSATIONS.health.messages
  );

  const scenario = PRELOADED_CONVERSATIONS[activeScenarioKey];

  const handleScenarioChange = (key) => {
    setActiveScenarioKey(key);
    setConversationList(PRELOADED_CONVERSATIONS[key].messages);
    setInputText("");
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    setIsTranslating(true);
    const newMsg = {
      id: Date.now(),
      speaker: activeSpeaker,
      original: inputText.trim(),
      translation:
        activeSpeaker === "a"
          ? `[अनुवाद / Translated]: ${inputText.trim()} (बोली संदेश)`
          : `[Mother Tongue]: ${inputText.trim()} (ᱥᱟᱱᱛᱟᱲᱤ / ᱥᱟᱱᱟᱢ)`,
      lang: activeSpeaker === "a" ? scenario.speakers.a.code : "hin",
    };

    setConversationList((prev) => [...prev, newMsg]);
    setInputText("");
    setIsTranslating(false);
    // Switch turn
    setActiveSpeaker((prev) => (prev === "a" ? "b" : "a"));
  };

  const playAudioMessage = async (msg) => {
    setPlayingId(msg.id);
    try {
      // Attempt backend speak if phrase bank or fall back to web speech
      const res = await speak(msg.translation, msg.lang);
      if (res?.kind === "audio" && res.blob) {
        const url = URL.createObjectURL(res.blob);
        const audio = new Audio(url);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => setPlayingId(null);
        await audio.play();
        return;
      }
    } catch {
      // Fallback to Web Speech API synthesiser
      if ("speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(msg.translation);
        utter.lang = "hi-IN";
        utter.onend = () => setPlayingId(null);
        utter.onerror = () => setPlayingId(null);
        window.speechSynthesis.speak(utter);
        return;
      }
    }
    setTimeout(() => setPlayingId(null), 1200);
  };

  return (
    <div className="conversation-mode-container sun-card-shadow" id="conversation-section">
      <div className="conversation-header">
        <div className="conv-title-stack">
          <div className="conv-badge">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              forum
            </span>
            <span>Boli Conversation · द्विभाषी नागरिक संवाद</span>
          </div>
          <h2 className="conv-heading">Two-Way Real-World Multilingual Dialogue</h2>
          <p className="conv-sub">
            Real-time bilingual communication between citizens speaking regional mother tongues and public service officers / teachers.
          </p>
        </div>

        {/* Scenario Switcher */}
        <div className="scenario-selector" role="tablist" aria-label="Conversation Scenarios">
          {Object.entries(PRELOADED_CONVERSATIONS).map(([key, item]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeScenarioKey === key}
              className={`scenario-btn ${activeScenarioKey === key ? "is-active" : ""}`}
              onClick={() => handleScenarioChange(key)}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {/* Speakers Header Bar */}
      <div className="conversation-speakers-bar">
        <div className={`speaker-profile profile-a ${activeSpeaker === "a" ? "is-turn" : ""}`}>
          <div className="speaker-avatar">A</div>
          <div className="speaker-meta">
            <div className="speaker-name">{scenario.speakers.a.name}</div>
            <div className="speaker-lang">बोली: {scenario.speakers.a.lang}</div>
          </div>
          {activeSpeaker === "a" && <span className="turn-indicator">बोलने की बारी (Speaking)</span>}
        </div>

        <div className="dialogue-exchange-icon">
          <span className="material-symbols-outlined">sync_alt</span>
        </div>

        <div className={`speaker-profile profile-b ${activeSpeaker === "b" ? "is-turn" : ""}`}>
          <div className="speaker-avatar">B</div>
          <div className="speaker-meta">
            <div className="speaker-name">{scenario.speakers.b.name}</div>
            <div className="speaker-lang">भाषा: {scenario.speakers.b.lang}</div>
          </div>
          {activeSpeaker === "b" && <span className="turn-indicator">बोलने की बारी (Speaking)</span>}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="conversation-log-window">
        {conversationList.map((msg) => {
          const isA = msg.speaker === "a";
          const speakerInfo = isA ? scenario.speakers.a : scenario.speakers.b;
          return (
            <div
              key={msg.id}
              className={`conv-message-row ${isA ? "msg-from-a" : "msg-from-b"}`}
            >
              <div className="conv-bubble">
                <div className="conv-bubble-sender">
                  <span>{speakerInfo.name}</span>
                  <span className="conv-bubble-lang">{isA ? scenario.speakers.a.lang : "हिन्दी"}</span>
                </div>
                <p className="conv-original-text">{msg.original}</p>
                <div className="conv-translation-divider" />
                <div className="conv-translated-row">
                  <span className="material-symbols-outlined conv-trans-icon">translate</span>
                  <span className="conv-translated-text">{msg.translation}</span>
                  <button
                    type="button"
                    className="conv-audio-btn"
                    onClick={() => playAudioMessage(msg)}
                    disabled={playingId === msg.id}
                    title="Listen to translation audio"
                    aria-label="Listen to translated speech"
                  >
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {playingId === msg.id ? "volume_up" : "play_circle"}
                    </span>
                    <span>{playingId === msg.id ? "Playing…" : "Listen"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Form & Turn Toggle */}
      <form className="conv-input-toolbar" onSubmit={handleSend}>
        <div className="turn-selector-tabs">
          <button
            type="button"
            className={`speaker-tab-btn ${activeSpeaker === "a" ? "active" : ""}`}
            onClick={() => setActiveSpeaker("a")}
          >
            Speaker A: {scenario.speakers.a.name.split(" ")[0]}
          </button>
          <button
            type="button"
            className={`speaker-tab-btn ${activeSpeaker === "b" ? "active" : ""}`}
            onClick={() => setActiveSpeaker("b")}
          >
            Speaker B: {scenario.speakers.b.name.split(" ")[0]}
          </button>
        </div>

        <div className="conv-input-row">
          <input
            type="text"
            className="conv-text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              activeSpeaker === "a"
                ? `Enter message in ${scenario.speakers.a.lang}…`
                : "अधिकारी / शिक्षक का संदेश हिन्दी में लिखें…"
            }
            aria-label="Message text"
          />
          <button
            type="submit"
            className="button button--primary tactile-btn-primary conv-send-btn"
            disabled={!inputText.trim() || isTranslating}
          >
            <span className="material-symbols-outlined text-base">send</span>
            <span>Translate & Speak</span>
          </button>
        </div>
      </form>
    </div>
  );
}
