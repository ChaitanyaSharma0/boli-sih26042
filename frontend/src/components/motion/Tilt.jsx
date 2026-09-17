import { useRef, useState } from "react";

/**
 * Tilt component inspired by motion-primitives.
 * Interactive 3D perspective tilt following pointer coordinates with realistic physics.
 */
export default function Tilt({
  children,
  rotationFactor = 9,
  className = "",
  style = {},
}) {
  const ref = useRef(null);
  const [transform, setTransform] = useState("");

  function handleMouseMove(e) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -rotationFactor;
    const rotateY = ((x - centerX) / centerX) * rotationFactor;

    setTransform(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`
    );
  }

  function handleMouseLeave() {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  }

  return (
    <div
      ref={ref}
      className={`tilt-card-container ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transform,
        transition: transform ? "transform 0.1s ease-out" : "transform 0.4s ease",
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );
}
