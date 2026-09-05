import { capabilityBadge, describeCapability } from "../capability";

// One selectable language, with its real capability spelled out.
//
// Both the badge and the description are derived from the API's
// `translation` and `tts` fields, never from the language code, and the
// wording lives in src/capability.js so it is testable and changeable in
// one place.
export default function LanguageChip({ language, selected, onToggle }) {
  const unavailable = language.translation === "none" && language.tts === "none";

  return (
    // The capability class comes from the same API field as the words, so
    // the visual distinction and the text cannot drift apart.
    <label
      className={`chip chip-${language.translation} ${
        selected ? "chip-selected" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={unavailable}
        onChange={() => onToggle(language.code)}
      />
      <span className="chip-body">
        <span className="chip-name">
          {language.name}
          <span className="chip-badge">{capabilityBadge(language)}</span>
        </span>
        <span className="chip-detail">{describeCapability(language)}</span>
        {language.note && <span className="chip-note">{language.note}</span>}
      </span>
    </label>
  );
}
