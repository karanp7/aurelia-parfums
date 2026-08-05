import React from 'react';
import PerfumeBottle from './PerfumeBottle.jsx';

// The hero's visual "stage" — separated from the hero section's copy/layout
// so it can hold a real product photo today and swap in real campaign
// photography or video later without touching App.jsx's hero markup.
//
// Deliberately does NOT fabricate a photorealistic scene with CSS (no fake
// rocks/water/lighting drawn from shapes) — the brief is explicit that
// faking luxury with CSS is worse than admitting a real campaign photo
// isn't shot yet. What CSS *can* honestly do to a real photo is apply
// actual art direction: a directional light scrim, a grounded contact
// shadow, a vignette — the same treatment a photographer/retoucher would
// apply, not an invented backdrop. When no real product image exists yet,
// this falls back to the same decorative bottle-scene used everywhere else
// on the site (PerfumeBottle's own fallback), never a fabricated photo.
export default function HeroMedia({ product, tone = 'rose', video = null, className = '' }) {
  return (
    <div className={`hero-media ${className}`.trim()} aria-hidden="true">
      <div className="hero-media-light" />
      {video ? (
        <video className="hero-media-video" src={video} autoPlay muted loop playsInline />
      ) : (
        <div className="hero-media-frame">
          <PerfumeBottle
            tone={product?.tone || tone}
            image={product?.image}
            alt={product?.imageAlt || product?.name || 'Perfume bottle'}
          />
        </div>
      )}
      <div className="hero-media-ground" />
    </div>
  );
}
