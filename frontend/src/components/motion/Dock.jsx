import { useState } from "react";

/**
 * Dock component inspired by motion-primitives (Apple-style magnification dock).
 * Magnifies icons near the active pointer with smooth spring scaling and tooltips.
 */
export default function Dock({ items = [], className = "" }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!items.length) return null;

  return (
    <div className={`classroom-dock-container ${className}`}>
      <nav
        className="classroom-dock"
        onMouseLeave={() => setHoveredIndex(null)}
        aria-label="Classroom Teacher Quick Bar"
      >
        {items.map((item, idx) => {
          let scale = 1;
          if (hoveredIndex !== null) {
            const diff = Math.abs(hoveredIndex - idx);
            if (diff === 0) scale = 1.34;
            else if (diff === 1) scale = 1.18;
            else if (diff === 2) scale = 1.06;
          }

          return (
            <button
              key={item.id || idx}
              type="button"
              className={`dock-item ${item.active ? "is-active" : ""}`}
              style={{
                transform: `scale(${scale}) translateY(${scale > 1 ? -(scale - 1) * 16 : 0}px)`,
              }}
              onMouseEnter={() => setHoveredIndex(idx)}
              onClick={item.onClick}
              title={item.title}
              aria-label={item.title}
            >
              {hoveredIndex === idx && (
                <span className="dock-tooltip">{item.title}</span>
              )}
              <span
                className="material-symbols-outlined dock-icon"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {item.icon}
              </span>
              {item.badge && <span className="dock-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
