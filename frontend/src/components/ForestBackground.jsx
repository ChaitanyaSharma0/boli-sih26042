import React from "react";

export default function ForestBackground() {
  return (
    <div className="forest-bg-container" aria-hidden="true">
      {/* Dynamic Sal Forest Photo Backdrop with Slow Ken-Burns Motion */}
      <div className="forest-photo-backdrop" />

      {/* Atmospheric Mist & Fog Overlay */}
      <div className="forest-mist-overlay" />

      {/* Soft Sunlight Caustics & Canopy Rays */}
      <div className="forest-light-rays" />


    </div>
  );
}
