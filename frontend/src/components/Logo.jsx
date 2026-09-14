import React from "react";

export default function Logo({ size = "medium", showTagline = true }) {
  const iconSize = size === "small" ? 36 : size === "large" ? 52 : 44;

  return (
    <div className={`boli-brand-container size-${size}`}>
      <div className="boli-logo-emblem" style={{ width: iconSize, height: iconSize }}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="boli-svg-logo"
        >
          <defs>
            {/* Primary emerald-to-forest gradient */}
            <linearGradient id="emblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1B6B45" />
              <stop offset="60%" stopColor="#114B30" />
              <stop offset="100%" stopColor="#082A1B" />
            </linearGradient>

            {/* Inner glow highlight */}
            <linearGradient id="borderHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#1B6B45" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#064E3B" stopOpacity="0.7" />
            </linearGradient>

            {/* Warm amber gradient for voice spark */}
            <linearGradient id="voiceAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Emerald glow filter */}
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#1B6B45" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Squircle base shield */}
          <rect
            x="2"
            y="2"
            width="44"
            height="44"
            rx="13"
            fill="url(#emblemGrad)"
            filter="url(#logoGlow)"
          />
          <rect
            x="2.5"
            y="2.5"
            width="43"
            height="43"
            rx="12.5"
            stroke="url(#borderHighlight)"
            strokeWidth="1.2"
          />

          {/* Left Side: Textbook Lesson Page (Curved Open Book) */}
          <path
            d="M22.5 16C17 15 12 17 9.5 18.5V34.5C12 33 17 31 22.5 32V16Z"
            fill="#FFFFFF"
            fillOpacity="0.92"
            className="book-page"
          />
          {/* Subtle lesson lines on book page */}
          <path
            d="M13 22.5C15.5 21.8 18 21.8 20 22.2M13 26.5C15.5 25.8 18 25.8 20 26.2"
            stroke="#114B30"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Center Spine */}
          <path
            d="M23 15V33"
            stroke="#34D399"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Right Side: Acoustic Sound Waves (Voice radiating from the textbook) */}
          {/* Wave 1: Immediate voice frequency */}
          <path
            d="M27 20C29.2 21.8 30.2 23.5 30.2 25.5C30.2 27.5 29.2 29.2 27 31"
            stroke="#34D399"
            strokeWidth="2.4"
            strokeLinecap="round"
            className="wave-inner"
          />

          {/* Wave 2: Mid audio wave */}
          <path
            d="M31.5 17C34.5 19.5 35.8 22.2 35.8 25.5C35.8 28.8 34.5 31.5 31.5 34"
            stroke="url(#voiceAmber)"
            strokeWidth="2.4"
            strokeLinecap="round"
            className="wave-mid"
          />

          {/* Wave 3: Outer sound broadcast wave */}
          <path
            d="M36 14C39.8 17.5 41.5 21.2 41.5 25.5C41.5 29.8 39.8 33.5 36 37"
            stroke="#34D399"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.8"
            className="wave-outer"
          />

          {/* Golden Knowledge & Voice Spark */}
          <circle cx="23" cy="11.5" r="2.2" fill="url(#voiceAmber)" />
        </svg>
      </div>

      <div className="boli-brand-text">
        <div className="boli-brand-title-row">
          <strong className="boli-brand-name">BOLI</strong>
          <span className="boli-voice-chip">VOICE AI</span>
        </div>
        {showTagline && (
          <small className="boli-brand-tagline">One lesson. More voices.</small>
        )}
      </div>
    </div>
  );
}
