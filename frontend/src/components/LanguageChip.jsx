import { capabilityBadge, describeCapability, nativeName } from "../capability";

// One selectable language, with its real capability spelled out.
//
// Both the badge and the description are derived from the API's
// `translation` and `tts` fields, never from the language code, and the
// wording lives in src/capability.js so it is testable and changeable in
// one place. The native-script name is decoration and is allowed to be
// missing; nothing about it changes what the chip claims.
export default function LanguageChip({ language, selected, onToggle }) {
  const unavailable = language.translation === "none" && language.tts === "none";
  const native = nativeName(language);

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
          <strong>{language.name}</strong>
          {native && (
            <span className="chip-native" lang={language.code}>
              {native}
            </span>
          )}
        </span>
        <span className="chip-badge">{capabilityBadge(language)}</span>
        <span className="chip-detail">{describeCapability(language)}</span>
        {language.note && <span className="chip-note">{language.note}</span>}
      </span>
    </label>
  );
}
