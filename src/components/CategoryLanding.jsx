import React, { useMemo, useState } from 'react';
import HeroMedia from './HeroMedia.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { deriveTone, findConcentration } from '../lib/shopifyProducts.js';

// Asset slots, one set per gender - separate from both the shop hero and
// the entry gateway's own hero so all three campaigns can be shot/updated
// independently. See public/images/campaigns/README.md for crop specs.
// Every path here is optional: HeroMedia already falls back to a neutral
// dark gradient, and PromoTile below does the same (one of the site's
// existing decorative tones, never a broken-image icon) for the three
// fixed promo tiles.
const HERO_IMAGES = {
  Men: { desktop: '/images/campaigns/category-men-desktop.jpg', tablet: '/images/campaigns/category-men-tablet.jpg', mobile: '/images/campaigns/category-men-mobile.jpg' },
  Women: { desktop: '/images/campaigns/category-women-desktop.jpg', tablet: '/images/campaigns/category-women-tablet.jpg', mobile: '/images/campaigns/category-women-mobile.jpg' }
};

const PROMO_IMAGES = {
  Men: { newArrivalOnly: '/images/campaigns/category-men-new.jpg', bestSellerOnly: '/images/campaigns/category-men-bestsellers.jpg', onSaleOnly: '/images/campaigns/category-men-sale.jpg' },
  Women: { newArrivalOnly: '/images/campaigns/category-women-new.jpg', bestSellerOnly: '/images/campaigns/category-women-bestsellers.jpg', onSaleOnly: '/images/campaigns/category-women-sale.jpg' }
};

const PROMO_TONES = { newArrivalOnly: 'tone-bg-blue', bestSellerOnly: 'tone-bg-amber', onSaleOnly: 'tone-bg-red' };

function PromoTile({ image, tone, label, onClick }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <button type="button" className={`promo-tile${failed ? ` promo-tile-fallback ${tone}` : ''}`} onClick={onClick}>
      {!failed && (
        <img className={`promo-tile-image${loaded ? ' is-loaded' : ''}`} src={image} alt="" loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      )}
      <span className="promo-tile-scrim" aria-hidden="true" />
      <span className="promo-tile-label">{label}</span>
    </button>
  );
}

// A shortcut tile with no photography requirement at all - family/
// occasion/concentration values come straight from live Shopify data, so
// there's no way to pre-name an image file for each one in advance the
// way the fixed hero/promo slots above can. Reuses the same deterministic
// tone-color system already covering ProductCard/Mood tiles instead.
function ShortcutTile({ label, onClick }) {
  return (
    <button type="button" className={`shortcut-tile tone-bg-${deriveTone(label)}`} onClick={onClick}>
      <span>{label}</span>
    </button>
  );
}

const HEADLINE_COPY = {
  Men: { eyebrow: "Men's Fragrances", headline: 'Confident. Refined.', lede: 'Woody, spiced and citrus scents built for everyday wear.' },
  Women: { eyebrow: "Women's Fragrances", headline: 'Elegant. Unmistakably you.', lede: 'Floral, warm and radiant scents for every occasion.' }
};

// The editorial landing page for Men/Women (H-08) - reached from the
// entry gateway's Men/Women choice, or directly via /men /women. Every
// section below either reuses something that already exists elsewhere on
// the site (the Mood tiles, the tone-color system, the product filters
// already backing the Collection grid) or is gated on real Shopify data
// (occasions, concentration) and stays hidden when that data doesn't
// exist yet - never a fabricated category.
export default function CategoryLanding({ gender, products, moodTiles, onShopAll, onFamily, onPromo, onMood, onOccasion, onConcentration }) {
  const genderProducts = useMemo(() => products.filter((product) => product.gender === gender), [products, gender]);
  const familyOptions = useMemo(() => [...new Set(genderProducts.map((product) => product.family))].sort(), [genderProducts]);
  const occasionOptions = useMemo(() => [...new Set(genderProducts.flatMap((product) => product.occasions || []))].sort(), [genderProducts]);
  const concentrationOptions = useMemo(() => [...new Set(genderProducts.map((product) => findConcentration(product)).filter(Boolean))].sort(), [genderProducts]);
  const promoAvailability = {
    newArrivalOnly: genderProducts.some((product) => product.badge === 'New'),
    bestSellerOnly: genderProducts.some((product) => product.badge === 'Bestseller'),
    onSaleOnly: genderProducts.some((product) => product.compareAtPrice)
  };
  const promoLabels = { newArrivalOnly: 'New Arrivals', bestSellerOnly: 'Best Sellers', onSaleOnly: 'On Sale' };
  const copy = HEADLINE_COPY[gender];

  return (
    <div className="category-landing">
      <nav className="category-subnav" aria-label={`${gender} categories`}>
        <h1>{gender}</h1>
        <div className="category-subnav-tabs" role="group" aria-label="Filter by family">
          <button type="button" onClick={onShopAll}>Shop All</button>
          {familyOptions.map((family) => <button key={family} type="button" onClick={() => onFamily(family)}>{family}</button>)}
        </div>
      </nav>

      <section className="category-hero">
        <HeroMedia
          desktopImage={HERO_IMAGES[gender].desktop}
          tabletImage={HERO_IMAGES[gender].tablet}
          mobileImage={HERO_IMAGES[gender].mobile}
          className="category-hero-media"
        />
        <div className="category-hero-copy">
          <p className="overline">{copy.eyebrow}</p>
          <h2>{copy.headline}</h2>
          <p className="lede">{copy.lede}</p>
          <Button variant="secondary" onClick={onShopAll}>Shop All <Icon name="arrowRight"/></Button>
        </div>
      </section>

      {(promoAvailability.newArrivalOnly || promoAvailability.bestSellerOnly || promoAvailability.onSaleOnly) && (
        <section className="promo-tiles" aria-label="Shop by">
          {Object.entries(promoAvailability).filter(([, available]) => available).map(([type]) => (
            <PromoTile key={type} image={PROMO_IMAGES[gender][type]} tone={PROMO_TONES[type]} label={promoLabels[type]} onClick={() => onPromo(type)} />
          ))}
        </section>
      )}

      {moodTiles?.length > 0 && (
        <section className="category-mood" data-reveal>
          <div className="section-intro"><p className="overline dark">Shop by mood</p><h2>Find the fragrance for the moment.</h2></div>
          <div className="mood-grid">
            {moodTiles.map((mood) => <button key={mood.label} className={`mood-tile tone-bg-${mood.tone}`} onClick={() => onMood(mood.label)}><span>{mood.label}</span></button>)}
          </div>
        </section>
      )}

      {familyOptions.length > 0 && (
        <section className="category-shortcuts" data-reveal>
          <div className="section-intro"><p className="overline dark">Shop by family</p><h2>Browse {gender}'s fragrance families.</h2></div>
          <div className="shortcut-row">
            {familyOptions.map((family) => <ShortcutTile key={family} label={family} onClick={() => onFamily(family)} />)}
          </div>
        </section>
      )}

      {occasionOptions.length > 0 && (
        <section className="category-shortcuts" data-reveal>
          <div className="section-intro"><p className="overline dark">Shop by occasion</p><h2>Find the right fit for the moment.</h2></div>
          <div className="shortcut-row shortcut-row-scroll">
            {occasionOptions.map((occasion) => <ShortcutTile key={occasion} label={occasion} onClick={() => onOccasion(occasion)} />)}
          </div>
        </section>
      )}

      {concentrationOptions.length >= 2 && (
        <section className="category-shortcuts" data-reveal>
          <div className="section-intro"><p className="overline dark">Shop by concentration</p><h2>Choose your intensity.</h2></div>
          <div className="shortcut-row">
            {concentrationOptions.map((concentration) => <ShortcutTile key={concentration} label={concentration} onClick={() => onConcentration(concentration)} />)}
          </div>
        </section>
      )}

      <section className="category-cta" data-reveal>
        <Button onClick={onShopAll}>Shop All {gender}'s Fragrances <Icon name="arrowRight"/></Button>
      </section>
    </div>
  );
}
