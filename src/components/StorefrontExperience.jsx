import React, { useMemo, useState } from 'react';
import PerfumeBottle from './PerfumeBottle.jsx';
import Icon from './Icon.jsx';
import { deriveTone, findConcentration } from '../lib/shopifyProducts.js';
import './storefront-experience-base.css';
import './storefront-experience-themes.css';

// Warm Gallery + Quiet Atelier storefront experience (preview route:
// /entrance - see App.jsx). Adapted from a standalone integration kit
// with its own sample apparel catalog (coats, totes, sneakers - not
// perfume) and no real navigation. Per this project's standing rule
// against fabricated customer-facing data, and the kit's own instruction
// to replace sample data with the real product source when available:
// `products` here is the same real, already-fetched Shopify catalog
// every other page uses (passed down from App.jsx, no separate fetch),
// and "View this piece"/the heart/the personal-shopper filters are wired
// to the same real handlers (onViewProduct -> the real PDP, onToggleWishlist
// -> the real wishlist) rather than inert kit placeholders.
//
// Real price buckets match the site's own existing convention (Under
// $100 / $100-200 / $200+ - see FilterBar.jsx's PRICE_BUCKETS) rather
// than the kit's own arbitrary $150 breakpoint, for consistency with
// every other filter UI on the site.
const PRICE_LABELS = [
  { value: 'All', test: () => true },
  { value: 'Under $100', test: (price) => price < 100 },
  { value: '$100 – $200', test: (price) => price >= 100 && price < 200 },
  { value: '$200+', test: (price) => price >= 200 }
];

function StoreHeader({ onHome }) {
  return (
    <header className="store-header">
      <button type="button" onClick={onHome}><small>THE</small><strong>AURELIA</strong></button>
      <p>ONLINE · ALWAYS OPEN</p>
      <div><span>Search</span><span>Bag</span></div>
    </header>
  );
}

function Filter({ label, value, options, onChange }) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div>{options.map((option) => (
        <button key={option} type="button" className={value === option ? 'selected' : ''} aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>
      ))}</div>
    </fieldset>
  );
}

export default function StorefrontExperience({ products, wishlist, onToggleWishlist, onViewProduct }) {
  const [stage, setStage] = useState('entrance');
  const [gender, setGender] = useState('Men');
  const [shopper, setShopper] = useState(true);
  const [theme, setTheme] = useState('gallery');
  const [brand, setBrand] = useState('All');
  const [priceLabel, setPriceLabel] = useState('All');
  const [family, setFamily] = useState('All');

  const enter = () => {
    setStage('entering');
    window.setTimeout(() => setStage('directory'), 2050);
  };
  const choose = (g) => {
    setGender(g);
    setBrand('All');
    setPriceLabel('All');
    setFamily('All');
    setStage('shop');
  };

  const genderProducts = useMemo(() => products.filter((product) => product.gender === gender), [products, gender]);
  const list = useMemo(() => {
    const priceTest = PRICE_LABELS.find((bucket) => bucket.value === priceLabel)?.test ?? (() => true);
    return genderProducts.filter((product) =>
      (brand === 'All' || product.house === brand) &&
      (family === 'All' || product.family === family) &&
      priceTest(product.price)
    );
  }, [genderProducts, brand, priceLabel, family]);
  const brands = useMemo(() => [...new Set(genderProducts.map((product) => product.house))].sort(), [genderProducts]);
  const families = useMemo(() => [...new Set(genderProducts.map((product) => product.family))].sort(), [genderProducts]);

  return (
    <main className={`store ${stage === 'entering' ? 'entering' : ''}`}>
      {(stage === 'entrance' || stage === 'entering') && (
        <section className="entrance-scene">
          <header><div><small>THE</small><strong>AURELIA</strong></div><span>AN IMMERSIVE SHOPPING EXPERIENCE</span></header>
          <div className="big-facade">
            <div className="canopy" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
            <div className="sign">AURELIA <small>PARFUMS</small></div>
            <button type="button" className="big-door" onClick={enter} disabled={stage === 'entering'} aria-label="Enter the store">
              <span className="store-glow" aria-hidden="true"><b>WELCOME</b><i/><i/><i/></span>
              <span className="door left"><i/><b/></span>
              <span className="door right"><i/><b/></span>
              <em>ENTER THE STORE <b>→</b></em>
            </button>
            <div className="door-step"/>
            <div className="wall-lines" aria-hidden="true"/>
          </div>
          <p className="entrance-caption">A DIGITAL STORE YOU CAN STEP INTO</p>
          <div className="flash" aria-hidden="true"/>
        </section>
      )}

      {stage === 'directory' && (
        <section className="directory">
          <StoreHeader onHome={() => setStage('entrance')}/>
          <div className="directory-space">
            <div className="directory-intro">
              <p>WELCOME IN</p>
              <h1>Where would you<br/>like to begin?</h1>
              <span>Choose a floor, just like you would in store.</span>
            </div>
            <div className="floor-board">
              <div className="board-head"><span>STORE DIRECTORY</span><i>YOU ARE HERE · GROUND</i></div>
              <button type="button" onClick={() => choose('Men')}><b>01</b><span><strong>MEN</strong><small>Woody · Citrus · Every fragrance for him</small></span><em>FIRST FLOOR →</em></button>
              <button type="button" onClick={() => choose('Women')}><b>02</b><span><strong>WOMEN</strong><small>Floral · New season · Every fragrance for her</small></span><em>SECOND FLOOR →</em></button>
              <div className="lift" aria-hidden="true"><i>↕</i><i>2</i><i>1</i><i>G</i></div>
            </div>
          </div>
          <div className="directory-floor" aria-hidden="true"/>
        </section>
      )}

      {stage === 'shop' && (
        <section className={`shopping-floor theme-${theme}`}>
          <StoreHeader onHome={() => setStage('entrance')}/>
          <nav className="floor-nav">
            <button type="button" onClick={() => setStage('directory')}>← Directory</button>
            <div>
              <button type="button" className={gender === 'Men' ? 'active' : ''} onClick={() => choose('Men')}>Men · 01</button>
              <button type="button" className={gender === 'Women' ? 'active' : ''} onClick={() => choose('Women')}>Women · 02</button>
            </div>
            <button type="button" onClick={() => setShopper((open) => !open)}>Personal shopper <i className={shopper ? 'online' : ''}/></button>
          </nav>

          <div className="style-lab">
            <span>TRY A STORE MOOD</span>
            <div>
              {[['gallery', 'Warm Gallery'], ['midnight', 'Midnight Luxury'], ['editorial', 'Bold Editorial'], ['atelier', 'Quiet Atelier']].map(([id, label]) => (
                <button key={id} type="button" className={theme === id ? 'selected' : ''} aria-pressed={theme === id} aria-label={label} onClick={() => setTheme(id)}><i aria-hidden="true"/><b>{label}</b></button>
              ))}
            </div>
          </div>

          <div className="floor-title">
            <p>FLOOR {gender === 'Men' ? '01' : '02'}</p>
            <h1>{gender === 'Men' ? "Men's collection" : "Women's collection"}</h1>
            <span>{list.length} {list.length === 1 ? 'fragrance' : 'fragrances'} selected for you</span>
          </div>

          <div className="shop-layout">
            <div className="shop-windows">
              {list.map((product, index) => {
                const wishlisted = wishlist.includes(product.id);
                const concentration = findConcentration(product);
                return (
                  <article className="product-window" key={product.id}>
                    <div className="window-top">
                      <span>WINDOW {String(index + 1).padStart(2, '0')}</span>
                      <button type="button" aria-label={wishlisted ? `Remove ${product.name} from saved` : `Save ${product.name}`} aria-pressed={wishlisted} onClick={() => onToggleWishlist(product.id)}>
                        <Icon name="heart" filled={wishlisted} size={16}/>
                      </button>
                    </div>
                    <div className={`product-stage${!product.image ? ` tone-bg-${deriveTone(product.id)}` : ''}`}>
                      <div className="bottle-wrap"><PerfumeBottle tone={deriveTone(product.id)} compact image={product.image} alt={product.imageAlt || product.name}/></div>
                      <span className="spotlight" aria-hidden="true"/>
                    </div>
                    <div className="product-info">
                      <div><p>{product.house}{concentration ? ` · ${concentration}` : ''}</p><h2>{product.name}</h2></div>
                      <strong>From ${product.price}</strong>
                    </div>
                    <button type="button" className="view-piece" onClick={() => onViewProduct(product)}>View this piece <span>→</span></button>
                  </article>
                );
              })}
              {list.length === 0 && (
                <div className="empty-window">
                  <p>No fragrances match that combination.</p>
                  <button type="button" onClick={() => { setBrand('All'); setPriceLabel('All'); setFamily('All'); }}>Clear my preferences</button>
                </div>
              )}
            </div>

            <aside className={`personal-shopper ${shopper ? 'open' : ''}`}>
              <div className="shopper-head">
                <div className="avatar" aria-hidden="true"><span/><i/></div>
                <div><p>PERSONAL SHOPPER</p><strong>Let me narrow the floor for you.</strong></div>
                <button type="button" aria-label="Close personal shopper" onClick={() => setShopper(false)}>×</button>
              </div>
              <p className="shopper-note">“Tell me what you're drawn to. I'll arrange the windows around your preferences.”</p>
              <Filter label="What are we looking for?" value={family} options={['All', ...families]} onChange={setFamily}/>
              <Filter label="Any favorite house?" value={brand} options={['All', ...brands]} onChange={setBrand}/>
              <Filter label="What feels comfortable?" value={priceLabel} options={PRICE_LABELS.map((bucket) => bucket.value)} onChange={setPriceLabel}/>
              <div className="shopper-result"><i aria-hidden="true"/><span>I found <strong>{list.length} {list.length === 1 ? 'fragrance' : 'fragrances'}</strong> for you.</span></div>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}
