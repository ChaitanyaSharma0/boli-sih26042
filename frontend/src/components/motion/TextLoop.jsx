import { useEffect, useState } from "react";

/**
 * TextLoop component inspired by motion-primitives.
 * Smoothly rotates through words with a clean 3D flip + blur transition.
 */
export default function TextLoop({
  items = [],
  interval = 2600,
  className = "",
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, interval);
    return () => clearInterval(timer);
  }, [items.length, interval]);

  if (!items.length) return null;

  return (
    <span className={`text-loop-wrapper ${className}`}>
      <span key={index} className="text-loop-item">
        {items[index]}
      </span>
    </span>
  );
}
