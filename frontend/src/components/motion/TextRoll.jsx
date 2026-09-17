/**
 * TextRoll component inspired by motion-primitives.
 * Performs a 3D character roll / flip on hover.
 */
export default function TextRoll({ text = "", className = "" }) {
  if (!text) return null;

  return (
    <span className={`text-roll-wrapper ${className}`}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="text-roll-char"
          style={{ transitionDelay: `${i * 24}ms` }}
        >
          <span className="char-front">{char === " " ? "\u00A0" : char}</span>
          <span className="char-back">{char === " " ? "\u00A0" : char}</span>
        </span>
      ))}
    </span>
  );
}
