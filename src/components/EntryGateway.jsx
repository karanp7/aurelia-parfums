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

const TILES = [
  { key: 'women', label: 'Women', cta: 'Shop Women', image: '/images/campaigns/gateway-women.jpg', tone: 'tone-bg-rose' },
  { key: 'men', label: 'Men', cta: 'Shop Men', image: '/images/campaigns/gateway-men.jpg', tone: 'tone-bg-blue' },
  { key: 'gifts', label: 'Gifts', cta: 'Shop Gifts', image: '/images/campaigns/gateway-gifts.jpg', tone: 'tone-bg-amber' }
];

function GatewayTile({ tile, onSelect }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
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
      <span className="gateway-tile-scrim" aria-hidden="true" />
      <span className="gateway-tile-copy">
        <span className="gateway-tile-label">{tile.label}</span>
        <span className="gateway-tile-cta">{tile.cta} <Icon name="arrowRight" size={13}/></span>
      </span>
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
