import { useEffect, useRef, useState } from "react";

/**
 * Spotlight component inspired by motion-primitives.
 * Tracks pointer movement across a container to render a dynamic radial spotlight glow.
 */
export default function Spotlight({
  className = "",
  size = 320,
  color = "rgba(254, 166, 25, 0.12)",
}) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    function onMouseMove(e) {
      const rect = parent.getBoundingClientRect();
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setOpacity(1);
    }

    function onMouseLeave() {
      setOpacity(0);
    }

    parent.addEventListener("mousemove", onMouseMove);
    parent.addEventListener("mouseleave", onMouseLeave);

    return () => {
      parent.removeEventListener("mousemove", onMouseMove);
      parent.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`spotlight-layer ${className}`}
      style={{
        pointerEvents: "none",
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          top: position.y - size / 2,
          left: position.x - size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          opacity,
          transition: "opacity 0.25s ease",
          filter: "blur(24px)",
        }}
      />
    </div>
  );
}
