import React from 'react';

// Wordmark-only today, deliberately — no flower/lotus mark exists as a
// designed asset yet, and inventing one would bake a permanent piece of
// brand identity into the site without real sign-off. `mark` is the slot
// for that future SVG: pass it in once a real logomark exists and it
// renders to the left of the wordmark with no other layout changes,
// because .logo is already a flex row waiting for it.
export default function Logo({ mark = null, className = '' }) {
  return (
    <a className={`logo ${className}`.trim()} href="#top">
      {mark && <span className="logo-mark">{mark}</span>}
      <span className="logo-text">AURELIA<small>PARFUMS</small></span>
    </a>
  );
}
