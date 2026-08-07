import React, { useState } from 'react';
import HeroMedia from './HeroMedia.jsx';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';

// Asset slots for the entry gateway - separate filenames from the shop
// homepage's own hero (hero-desktop-placeholder.*) so the two campaigns
// can be shot/updated independently. See public/images/campaigns/README.md
// for exact crop specs. Every one of these is optional: HeroMedia already
// falls back to a neutral dark gradient on a failed hero load, and
// GatewayTile below does the same (a tone-based gradient, never a broken-
// image icon) for the three category tiles.
const GATEWAY_HERO = {
  desktop: '/images/campaigns/gateway-hero-desktop.jpg',
  tablet: '/images/campaigns/gateway-hero-tablet.jpg',
  mobile: '/images/campaigns/gateway-hero-mobile.jpg'
};

// Heading/tagline copy is original to Aurelia (matching the site's
// existing voice - "Choose slowly. Wear confidently." etc.) rather than
// lifted from any reference moodboard - a shared caption *layout* is
// fair inspiration, but another brand's actual ad copy isn't Aurelia's
// to reuse. Kept here (used as the accessible label, and as the visible
// caption if a tile's own image ever fails to load or gets swapped for
// an uncaptioned photo) even though `captioned: true` tiles currently
// have this same information baked into the image itself.
const TILES = [
  { key: 'women', heading: ['Women'], tagline: 'ELEGANT. RADIANT. ENTIRELY YOU.', cta: "Explore Women's", image: '/images/campaigns/gateway-women.jpg', tone: 'tone-bg-rose', captioned: true },
  { key: 'men', heading: ['Men'], tagline: 'STRONG. REFINED. QUIETLY CONFIDENT.', cta: "Explore Men's", image: '/images/campaigns/gateway-men.jpg', tone: 'tone-bg-blue', captioned: true },
  { key: 'gifts', heading: ['The Perfect', 'Gift'], tagline: 'THOUGHTFULLY CHOSEN. BEAUTIFULLY GIVEN.', cta: 'Explore Gifts', image: '/images/campaigns/gateway-gifts.jpg', tone: 'tone-bg-amber', captioned: true }
];

function GatewayTile({ tile, onSelect }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // `captioned` tiles already have the heading/tagline/CTA baked into the
  // photo itself (see TILES above) - rendering the same text again in
  // HTML on top would double it up. Falls back to the real HTML caption
  // whenever there's nothing baked in to show instead: the image failed
  // to load, or a future photo is captioned: false.
  const showOverlay = failed || !tile.captioned;
  return (
    <button type="button" className={`gateway-tile${failed ? ` gateway-tile-fallback ${tile.tone}` : ''}`} onClick={() => onSelect(tile.key)}>
      {!failed && (
        <img
          className={`gateway-tile-image${loaded ? ' is-loaded' : ''}`}
          src={tile.image}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {showOverlay && <span className="gateway-tile-scrim" aria-hidden="true" />}
      {showOverlay ? (
        <span className="gateway-tile-copy">
          <span className="gateway-tile-label">{tile.heading.map((line) => <span key={line}>{line}</span>)}</span>
          <span className="gateway-tile-rule" aria-hidden="true" />
          <span className="gateway-tile-tagline">{tile.tagline}</span>
          <span className="gateway-tile-cta">{tile.cta} <Icon name="arrowRight" size={13}/></span>
        </span>
      ) : (
        <span className="sr-only">{tile.heading.join(' ')} — {tile.tagline} {tile.cta}</span>
      )}
    </button>
  );
}

// The site's real front door (see App.jsx's hasEntered gating) - a bold,
// full-bleed editorial moment with no shop chrome (no cart/search/menu;
// just the wordmark) followed by the three ways in. Deliberately its own
// component/class names rather than reusing .hero-cinematic/.hero-copy,
// so styling this doesn't risk the existing shop homepage's hero.
export default function EntryGateway({ onSelect }) {
  return (
    <div className="entry-gateway">
      <header className="entry-gateway-header">
        <Logo variant="stacked" theme="light" />
      </header>

      <section className="entry-gateway-hero">
        <HeroMedia
          desktopImage={GATEWAY_HERO.desktop}
          tabletImage={GATEWAY_HERO.tablet}
          mobileImage={GATEWAY_HERO.mobile}
          className="entry-gateway-hero-media"
        />
        <div className="entry-gateway-hero-copy">
          <p className="overline">Aurelia Parfums</p>
          <h1>Authentic Luxury Fragrances.</h1>
          <p className="entry-gateway-scrollcue">Choose where to begin <Icon name="chevronDown" size={13}/></p>
        </div>
      </section>

      <section className="entry-gateway-tiles" aria-label="Shop by">
        {TILES.map((tile) => <GatewayTile key={tile.key} tile={tile} onSelect={onSelect} />)}
      </section>
    </div>
  );
}
