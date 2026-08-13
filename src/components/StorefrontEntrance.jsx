import React, { useEffect, useState } from 'react';
import './storefront-entrance.css';

// Immersive door-entrance experience (preview route: /entrance - see
// App.jsx). Adapted from a standalone integration-kit component: no
// "use client" (this app is a plain Vite SPA, not Next.js), and instead
// of importing its own router hook, navigation is a prop like every other
// component in this codebase already receives it (see ProductCard's
// onOpen, CategoryListing's openProduct, etc.) - keeps all real routing
// decisions centralized in App.jsx rather than scattered across
// components that each reach into the router themselves.
//
// The kit's own interior arrival panel was a placeholder dead end by
// design ("shopping floor ready for the next phase," no way to actually
// reach any real page). onEnterShop is the real destination - the
// existing "All Fragrances" sidebar-filter listing at '/' - wired so
// arriving inside is a real front door, not a dead end.
export default function StorefrontEntrance({ onEnterShop }) {
  const [entering, setEntering] = useState(false);
  const [inside, setInside] = useState(false);

  useEffect(() => {
    if (!entering) return undefined;
    const timer = window.setTimeout(() => setInside(true), 2100);
    return () => window.clearTimeout(timer);
  }, [entering]);

  const reset = () => { setInside(false); setEntering(false); };

  return (
    <main className={`experience${entering ? ' is-entering' : ''}${inside ? ' is-inside' : ''}`}>
      <header className="topbar">
        <div className="wordmark"><span>AURELIA</span> PARFUMS</div>
        <p>Online · Always open</p>
        <div className="mode"><i/> Immersive entrance</div>
      </header>

      <section className="street-view" aria-label="Store entrance">
        <div className="building-copy">
          <p className="kicker">A new way to shop online</p>
          <h1>Come on<br/>in.</h1>
          <p className="hint">Explore fragrances as if you were really there.</p>
        </div>

        <div className="facade">
          <div className="awning" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></div>
          <div className="store-sign"><small>THE</small><strong>AURELIA</strong><small>PARFUMS</small></div>

          <div className="window left-window" aria-hidden="true">
            <div className="shine"/>
            <div className="plinth tall"><span className="object bag"/></div>
            <div className="plinth"><span className="object vase"/></div>
            <p>NEW<br/>ARRIVALS</p>
          </div>

          <button
            type="button"
            className="entrance"
            onClick={() => setEntering(true)}
            disabled={entering}
            aria-label="Enter the store"
          >
            <span className="door-frame">
              <span className="inside-glow"><i/><b>WELCOME</b></span>
              <span className="door door-left"><i/><b/></span>
              <span className="door door-right"><i/><b/></span>
            </span>
            <span className="enter-label"><i/> Click to enter <b>→</b></span>
          </button>

          <div className="window right-window" aria-hidden="true">
            <div className="shine"/>
            <div className="shelf"><i/><i/><i/><i/><i/></div>
            <div className="plinth tall"><span className="object shoe"/></div>
            <p>CURATED<br/>FOR YOU</p>
          </div>
          <div className="base-line"/>
        </div>

        <div className="pavement" aria-hidden="true"><i/><i/><i/><i/></div>
        <div className="scroll-note">ENTER THE EXPERIENCE <i>↓</i></div>
      </section>

      <section className="interior" aria-live="polite">
        <div className="interior-lights" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        <div className="arrival-copy">
          <p>YOU&apos;RE INSIDE</p>
          <h2>Welcome to<br/>Aurelia.</h2>
          <p>Every fragrance in the collection, ready to explore.</p>
          <div className="arrival-actions">
            <button type="button" className="btn-primary" onClick={onEnterShop}>Browse All Fragrances</button>
            <button type="button" className="btn-secondary" onClick={reset}>Return to entrance</button>
          </div>
        </div>
      </section>

      <div className="transition-flash" aria-hidden="true"/>
    </main>
  );
}
