import React from "react";
import logoSrc from "../assets/logo.png";

export default function Logo({ size = "medium", showTagline = true }) {
  const iconSize = size === "small" ? 38 : size === "large" ? 54 : 44;

  return (
    <div
      className={`boli-brand-container size-${size}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <div
        className="boli-logo-emblem"
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(56, 28, 5, 0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#381c05",
          flexShrink: 0,
        }}
      >
        <img
          src={logoSrc}
          alt="BOLI Brand Logo"
          width={iconSize}
          height={iconSize}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>

      <div
        className="boli-brand-text"
        style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}
      >
        <div
          className="boli-brand-title-row"
          style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
        >
          <strong
            className="boli-brand-name"
            style={{
              fontSize: size === "small" ? "1.25rem" : "1.45rem",
              fontWeight: 800,
              color: "#381c05",
              letterSpacing: "-0.02em",
              fontFamily: "var(--font-display, inherit)",
            }}
          >
            BOLI
          </strong>
          <span
            className="boli-voice-chip"
            style={{
              background: "var(--secondary-container, #fea619)",
              color: "var(--on-secondary-fixed, #381c05)",
              fontSize: "0.68rem",
              fontWeight: 800,
              padding: "0.15rem 0.5rem",
              borderRadius: "9999px",
              letterSpacing: "0.02em",
            }}
          >
            बोली
          </span>
        </div>
        {showTagline && (
          <small
            className="boli-brand-tagline"
            style={{
              fontSize: "0.72rem",
              color: "var(--text-muted, #574e45)",
              fontWeight: 600,
            }}
          >
            झारखण्ड प्राथमिक शिक्षा
          </small>
        )}
      </div>
    </div>
  );
}
