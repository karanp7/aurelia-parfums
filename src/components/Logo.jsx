import React from 'react';

// Wordmark-only today, deliberately - no flower/lotus mark exists as a
// designed asset yet, and inventing one would bake a permanent piece of
// brand identity into the site without real sign-off. `mark` is the slot
// for that future SVG: pass it in once a real logomark exists and it
// renders correctly in either layout below with no other changes needed
// at any of the current call sites.
//
// `variant="inline"` (default) is the nav's side-by-side lockup used
// everywhere today. `variant="stacked"` centers the mark above the
// wordmark - for a future splash/loading state or a centered footer
// treatment, neither of which exist yet, but the system is ready.
//
// `theme` lets a caller force light/dark coloring independent of
// whatever background it sits on. Default "auto" keeps color:inherit -
// exactly every current call site's existing behavior (nav reads dark on
// the light nav bar, footer reads light on --graphite, purely because
// each parent already sets its own text color) - "light"/"dark" are for
// a future case that needs to override that regardless of context.
export default function Logo({ mark = null, variant = 'inline', theme = 'auto', className = '' }) {
  const classes = ['logo', `logo--${variant}`, theme !== 'auto' ? `logo--${theme}` : null, className]
    .filter(Boolean)
    .join(' ');
  return (
    <a className={classes} href="#top">
      {mark && <span className="logo-mark">{mark}</span>}
      <span className="logo-text">AURELIA<small>PARFUMS</small></span>
    </a>
  );
}
