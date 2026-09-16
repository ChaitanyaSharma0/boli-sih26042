import { capabilityBadge, describeCapability, nativeName } from "../capability";

export default function LanguageChip({ language, selected, onToggle }) {
  const unavailable = language.translation === "none" && language.tts === "none";
  const native = nativeName(language);
  const isAi = language.translation === "full";

  return (
    <label
      className={`lang-select-card chip chip-${language.translation} ${
        isAi ? "is-ai" : "is-bank"
      } ${selected ? "is-selected chip-selected" : ""} ${
        unavailable ? "is-disabled" : ""
      }`}
    >
      <input
        type="checkbox"
        className="lang-card-input"
        checked={selected}
        disabled={unavailable}
        onChange={() => onToggle(language.code)}
      />
      <div className="lang-card-content chip-body">
        <div className="lang-card-top">
          <div
            className={`lang-card-check-box ${selected ? "is-checked" : ""}`}
            aria-hidden="true"
          >
            {selected && (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px", fontWeight: "bold" }}
              >
                check
              </span>
            )}
          </div>
          <div className="lang-card-title-wrap chip-name">
            <strong className="lang-card-name">{language.name}</strong>
            {native && (
              <span className="lang-card-native chip-native" lang={language.code}>
                {native}
              </span>
            )}
          </div>
          <span
            className={`lang-badge chip-badge ${
              isAi ? "lang-badge--ai" : "lang-badge--bank"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "13px" }}
            >
              {isAi ? "verified" : "record_voice_over"}
            </span>
            <span>{capabilityBadge(language)}</span>
          </span>
        </div>

        <p className="lang-card-desc chip-detail">
          {describeCapability(language)}
        </p>

        {language.note && (
          <div className="lang-card-note chip-note">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "14px" }}
            >
              info
            </span>
            <span>{language.note}</span>
          </div>
        )}
      </div>
    </label>
  );
}

