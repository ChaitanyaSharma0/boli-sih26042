import { useState, useEffect } from "react";

const GREETINGS = [
  "जोहार बच्चों! (Johar!) आओ अपनी मातृभाषा में सीखें!",
  "सुप्रभात! आज हम मिलकर कहानी सुनेंगे!",
  "वाह! कितना सुंदर पाठ है! चलो अपनी बोली में बोलें!",
  "ᱥᱟᱹᱜᱩᱱ ᱡᱚᱦᱟᱨ! (Sagun Johar!) आओ मिलकर पढ़ें!",
  "जोहार! अपनी भाषा, अपनी पहचान!",
];

export default function BoliMascot({ currentGrade = 2 }) {
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [isWaving, setIsWaving] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % GREETINGS.length);
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 1200);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleClick = () => {
    setGreetingIndex((prev) => (prev + 1) % GREETINGS.length);
    setIsWaving(true);
    setTimeout(() => setIsWaving(false), 1200);
  };

  return (
    <div
      className="boli-mascot-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title="क्लिक करके बोली साथी से बात करें!"
      aria-label="बोली साथी - प्राथमिक विद्यालय मित्र"
    >
      {/* Playful Floating Sparkles / Musical Notes */}
      <div className="mascot-floating-particles" aria-hidden="true">
        <span className="particle p1">⭐</span>
        <span className="particle p2">🎵</span>
        <span className="particle p3">✨</span>
        <span className="particle p4">🌿</span>
      </div>

      {/* Mascot Character Avatar (Jharkhand Melodious Koel with School Bag & Flower) */}
      <div className={`mascot-avatar-wrap ${isWaving ? "is-waving" : ""}`}>
        <svg
          viewBox="0 0 100 100"
          className="mascot-svg"
          width="76"
          height="76"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Koel Plumage Gradient */}
            <linearGradient id="birdPlumage" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1B4D3E" />
              <stop offset="60%" stopColor="#0B2B20" />
              <stop offset="100%" stopColor="#061811" />
            </linearGradient>
            {/* Palash Orange Crest */}
            <linearGradient id="orangeCrest" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF9800" />
              <stop offset="100%" stopColor="#E65100" />
            </linearGradient>
            {/* Beak Amber */}
            <linearGradient id="beakAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD54F" />
              <stop offset="100%" stopColor="#FFB300" />
            </linearGradient>
          </defs>

          {/* Cheerful Shadow */}
          <ellipse cx="50" cy="92" rx="26" ry="6" fill="#000000" opacity="0.14" />

          {/* Body */}
          <ellipse cx="50" cy="58" rx="28" ry="30" fill="url(#birdPlumage)" />

          {/* Cute Yellow Primary School Satchel / Bag on side */}
          <rect x="24" y="58" width="16" height="14" rx="4" fill="#FFC107" stroke="#FFA000" strokeWidth="1.5" />
          <path d="M28 58 C28 52 36 52 36 58" stroke="#FFA000" strokeWidth="2" fill="none" />
          <circle cx="32" cy="65" r="1.5" fill="#E65100" />

          {/* Big Cheerful Eyes */}
          {/* Left Eye */}
          <circle cx="40" cy="46" r="8" fill="#FFFFFF" />
          <circle cx="42" cy="46" r="4.5" fill="#1A1A1A" />
          <circle cx="43.5" cy="44" r="2" fill="#FFFFFF" />

          {/* Right Eye */}
          <circle cx="60" cy="46" r="8" fill="#FFFFFF" />
          <circle cx="58" cy="46" r="4.5" fill="#1A1A1A" />
          <circle cx="59.5" cy="44" r="2" fill="#FFFFFF" />

          {/* Rosy Primary School Cheeks */}
          <ellipse cx="32" cy="54" rx="4.5" ry="3" fill="#FF8A80" opacity="0.7" />
          <ellipse cx="68" cy="54" rx="4.5" ry="3" fill="#FF8A80" opacity="0.7" />

          {/* Cheerful Golden Beak */}
          <path d="M46 51 Q50 61 54 51 Z" fill="url(#beakAmber)" />
          <path d="M46 51 L54 51" stroke="#FF8F00" strokeWidth="1" />

          {/* Palash Flower on Head / Cute Crest */}
          <circle cx="50" cy="22" r="5" fill="url(#orangeCrest)" />
          <circle cx="44" cy="25" r="4" fill="url(#orangeCrest)" />
          <circle cx="56" cy="25" r="4" fill="url(#orangeCrest)" />
          <circle cx="50" cy="24" r="2.5" fill="#FFF176" />

          {/* Friendly Waving Wing */}
          <path
            className="mascot-wing"
            d="M74 54 C82 48 88 56 80 68 C75 74 70 70 72 62 Z"
            fill="#1B4D3E"
          />

          {/* Left Resting Wing */}
          <path d="M26 54 C20 58 18 68 25 72 C28 72 30 66 28 60 Z" fill="#0B2B20" />

          {/* Little Feet */}
          <path d="M42 88 L42 93 M40 93 L44 93" stroke="#FFA000" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M58 88 L58 93 M56 93 L60 93" stroke="#FFA000" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Speech Bubble for Kids */}
      <div className="mascot-speech-bubble">
        <div className="speech-bubble-tail" />
        <div className="mascot-name-tag">
          <span>बोली साथी (Boli Saathi)</span>
          <span className="mascot-class-badge">कक्षा {currentGrade} मित्र</span>
        </div>
        <p className="mascot-dialogue">{GREETINGS[greetingIndex]}</p>
      </div>
    </div>
  );
}
