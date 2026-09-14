import { capabilityBadge, describeCapability, nativeName } from "../capability";

// One selectable language, with its real capability spelled out.
//
// The badge, the description and the edge style all come from the API's
// `translation` and `tts` fields, never from the language code, and the
// wording lives in src/capability.js so it is testable and changeable in
// one place. The native-script name is decoration and may be missing;
// nothing about it changes what the chip claims.
export default function LanguageChip({ language, selected, onToggle }) {
  const unavailable = language.translation === "none" && language.tts === "none";
  const native = nativeName(language);

  return (
    <label
      className={`chip cap-${language.translation} ${
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
        <span className="chip-head">
          <span className="chip-name">{language.name}</span>
          {native && (
            <span className="in-script" lang={language.code}>
              {native}
            </span>
          )}
          <span className="badge">{capabilityBadge(language)}</span>
        </span>
        <span className="chip-detail">{describeCapability(language)}</span>
        {language.note && <span className="chip-note">{language.note}</span>}
      </span>
    </label>
  );
}
