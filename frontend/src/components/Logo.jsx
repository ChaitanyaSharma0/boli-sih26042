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
            {/* Primary emerald gradient */}
            <linearGradient id="emblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1B6B45" />
              <stop offset="60%" stopColor="#125032" />
              <stop offset="100%" stopColor="#0B3822" />
            </linearGradient>

            {/* Inner glow highlight */}
            <linearGradient id="borderHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#1B6B45" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#052E16" stopOpacity="0.6" />
            </linearGradient>

            {/* Amber soundwave accent */}
            <linearGradient id="amberWave" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1B6B45" floodOpacity="0.35" />
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

          {/* Radiating soundwave arcs (Voice/Acoustics) */}
          <path
            d="M34 14C36.8 17 38 20.5 38 24.5C38 28.5 36.8 32 34 35"
            stroke="#34D399"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
            className="wave-outer"
          />
          <path
            d="M30 18C31.8 20 32.5 22.2 32.5 24.5C32.5 26.8 31.8 29 30 31"
            stroke="url(#amberWave)"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="wave-inner"
          />

          {/* Amber voice broadcast spark */}
          <circle cx="37" cy="11" r="2" fill="#FBBF24" />

          {/* Central Devanagari 'बो' glyph */}
          <text
            x="19"
            y="32"
            fill="#FFFFFF"
            fontSize="23"
            fontWeight="800"
            textAnchor="middle"
            fontFamily="'Noto Sans Devanagari', 'Yatra One', system-ui, sans-serif"
            style={{ textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}
          >
            बो
          </text>
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
