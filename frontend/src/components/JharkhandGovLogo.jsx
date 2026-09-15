export default function JharkhandGovLogo({ size = 44, className = "" }) {
  return (
    <div
      className={`jharkhand-gov-emblem-wrap ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
      }}
      title="Government of Jharkhand · झारखण्ड सरकार"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="jharkhand-emblem-svg"
        aria-label="Government of Jharkhand Official Emblem"
      >
        <defs>
          {/* State forest emerald gradient */}
          <radialGradient id="jharkhandBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1E824C" />
            <stop offset="70%" stopColor="#115E34" />
            <stop offset="100%" stopColor="#08381D" />
          </radialGradient>
          <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="50%" stopColor="#FFB300" />
            <stop offset="100%" stopColor="#FF8F00" />
          </linearGradient>
          <filter id="jhGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#08381D" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer Circular Seal Base */}
        <circle cx="60" cy="60" r="57" fill="url(#jharkhandBg)" filter="url(#jhGlow)" />
        <circle cx="60" cy="60" r="56" stroke="url(#goldRim)" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="50" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.7" />

        {/* Outer Text Arc Area */}
        {/* Arc Path for top text: झारखण्ड सरकार */}
        <path id="textArcTop" d="M 18,60 A 42,42 0 0,1 102,60" fill="none" />
        <text fill="#FFFFFF" fontSize="8.5" fontWeight="700" letterSpacing="0.8" textAnchor="middle">
          <textPath href="#textArcTop" startOffset="50%">
            झारखण्ड सरकार
          </textPath>
        </text>

        {/* Arc Path for bottom text: GOVT. OF JHARKHAND */}
        <path id="textArcBottom" d="M 102,60 A 42,42 0 0,1 18,60" fill="none" />
        <text fill="#FFE082" fontSize="6.8" fontWeight="700" letterSpacing="1.2" textAnchor="middle">
          <textPath href="#textArcBottom" startOffset="50%">
            GOVT. OF JHARKHAND
          </textPath>
        </text>

        {/* Ring 1: 24 Elephants Ring (White Dots / Stylized Motifs) */}
        <circle cx="60" cy="60" r="38" stroke="#FFE082" strokeWidth="0.8" strokeDasharray="1.5 3.5" />

        {/* Ring 2: Palash Flowers (Orange/Crimson Petals) */}
        <circle cx="60" cy="60" r="32" stroke="#FF5722" strokeWidth="1.6" strokeDasharray="3 4" />

        {/* Ring 3: Tribal Dancing Figures (Sauria Paharia Ring) */}
        <circle cx="60" cy="60" r="26" stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="2 3" />

        {/* Inner Core Circle */}
        <circle cx="60" cy="60" r="20" fill="#FFFFFF" />
        <circle cx="60" cy="60" r="20" stroke="url(#goldRim)" strokeWidth="1.5" />

        {/* Center: Ashoka Lion Capital Stencil Silhouette */}
        {/* Base Pedestal / Chakra */}
        <rect x="52" y="70" width="16" height="3" rx="1" fill="#115E34" />
        <circle cx="60" cy="71.5" r="1.2" fill="#FFE082" />
        
        {/* Lions Silhouette */}
        {/* Center Lion */}
        <path
          d="M57 60 C57 56 63 56 63 60 C64 62 64 66 63 69 L57 69 C56 66 56 62 57 60 Z"
          fill="#115E34"
        />
        {/* Left Lion */}
        <path
          d="M53 62 C51 59 55 57 57 60 C57 63 56 66 54 69 L52 69 C51 66 52 64 53 62 Z"
          fill="#115E34"
        />
        {/* Right Lion */}
        <path
          d="M67 62 C69 59 65 57 63 60 C63 63 64 66 66 69 L68 69 C69 66 68 64 67 62 Z"
          fill="#115E34"
        />
        {/* Ashoka Crown */}
        <circle cx="60" cy="54" r="2.5" fill="#115E34" />
      </svg>

      <div className="gov-title-stack" style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#005231", letterSpacing: "0.02em" }}>
          झारखण्ड सरकार
        </div>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#855300", letterSpacing: "0.01em" }}>
          Govt. of Jharkhand
        </div>
        <div style={{ fontSize: "0.62rem", color: "#6b7280", fontWeight: 600 }}>
          स्कूली शिक्षा एवं साक्षरता विभाग
        </div>
      </div>
    </div>
  );
}
