import React, { useMemo, useState } from 'react';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import PerfumeBottle from './PerfumeBottle.jsx';
import { deriveTone, findConcentration } from '../lib/shopifyProducts.js';

const money = (value) => `$${Number(value).toFixed(2).replace('.00', '')}`;

// Real bestseller-first, catalog-fallback selection - same pattern
// bestSellers in App.jsx already uses, just scoped to one gender. Never a
// fixed list of handles (a kit this was adapted from assumed specific
// products like "sauvage-edp"/"libre" exist - this store's real catalog
// might not have those exact handles, so picking dynamically by real tag
// data is the only version that can't silently break).
function pickBottles(products, gender, count) {
  const inGender = products.filter((product) => product.gender === gender);
  const tagged = inGender.filter((product) => product.badge === 'Bestseller');
  const rest = inGender.filter((product) => product.badge !== 'Bestseller');
  return [...tagged, ...rest].slice(0, count);
}

function BoutiqueBottle({ product, wishlisted, onToggleWishlist, onView, onQuickAdd, mutating }) {
  const [justAdded, setJustAdded] = useState(false);
  const concentration = findConcentration(product);
  const primarySize = product.sizes?.[0];

  const handleAdd = async () => {
    await onQuickAdd(product, primarySize?.label);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <article className="boutique-bottle">
      <button
        type="button"
        className="boutique-bottle-wishlist"
        aria-label={wishlisted ? `Remove ${product.name} from saved` : `Save ${product.name}`}
        aria-pressed={wishlisted}
        onClick={() => onToggleWishlist(product.id)}
      >
        <Icon name="heart" filled={wishlisted} size={15} />
      </button>
      <button type="button" className="boutique-bottle-stage" onClick={() => onView(product)} aria-label={`View ${product.name}`}>
        <PerfumeBottle tone={deriveTone(product.id)} compact image={product.image} alt={product.imageAlt || product.name} />
      </button>
      <div className="boutique-bottle-info">
        <p>{product.house}{concentration ? ` · ${concentration}` : ''}</p>
        <h3>{product.name}</h3>
        <strong>From {money(product.price)}</strong>
      </div>
      <button
        type="button"
        className={`boutique-bottle-add${justAdded ? ' is-added' : ''}`}
        disabled={!product.availableForSale || mutating}
        onClick={handleAdd}
      >
        {!product.availableForSale ? 'Sold out' : justAdded ? <>Added <Icon name="check" size={13} /></> : 'Add to bag'}
      </button>
    </article>
  );
}

// The new main homepage ("/") - an architectural, department-store-style
// front adapted from an uploaded reference kit whose own homepage was one
// fixed photographed storefront image (aurelia-storefront-reference.png)
// with invisible hotspots pinned to exact pixels in that photo. That photo
// was never provided and can't be fabricated (no faking a photographed
// boutique), so this keeps the kit's real idea - windows, doors, a brand
// strip, real navigation - built from this store's own real product
// photography and real catalog data instead of one asset that doesn't
// exist. What used to live at "/" (the entry gateway + full shop homepage)
// moved to /entrance unchanged, still reachable directly.
export default function Storefront({
  products, wishlist, onToggleWishlist, mutating, onQuickAdd, onViewProduct,
  brandOptions, onShopMen, onShopWomen, onShopBrand, onShopAll, onGoToGifts,
  onOpenQuiz, onOpenSearch, onOpenCart, onGoToPromise, itemCount
}) {
  const menBottles = useMemo(() => pickBottles(products, 'Men', 3), [products]);
  const womenBottles = useMemo(() => pickBottles(products, 'Women', 3), [products]);
  const brands = useMemo(() => brandOptions.slice(0, 8), [brandOptions]);

  return (
    <div className="boutique" id="top">
      <header className="boutique-nav">
        <Logo onClick={(event) => { event?.preventDefault(); document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' }); }} />
        <nav aria-label="Primary">
          <button type="button" onClick={onShopMen}>Men</button>
          <button type="button" onClick={onShopWomen}>Women</button>
          <button type="button" onClick={onGoToGifts}>Gifts</button>
          <button type="button" onClick={onOpenQuiz}>Discover</button>
          <button type="button" onClick={onGoToPromise}>Aurelia Promise</button>
        </nav>
        <div className="boutique-nav-actions">
          <button type="button" aria-label="Search fragrances" onClick={onOpenSearch}><Icon name="search" /></button>
          <button type="button" aria-label={`Open bag with ${itemCount} items`} onClick={onOpenCart}>
            <Icon name="bag" />{itemCount > 0 && <b>{itemCount}</b>}
          </button>
        </div>
      </header>

      <section className="boutique-facade" aria-label="Shop by">
        <button type="button" className="facade-window facade-men" onClick={onShopMen}>
          <span className="window-eyebrow">01 · First floor</span>
          <span className="window-heading">Men</span>
          <span className="window-tagline">Woody · Citrus · Every fragrance for him</span>
          <div className="window-art" aria-hidden="true">
            {menBottles[0] && <PerfumeBottle tone={deriveTone(menBottles[0].id)} image={menBottles[0].image} alt="" />}
          </div>
          <span className="window-cta">Explore Men's <Icon name="arrowRight" size={14} /></span>
        </button>

        <div className="facade-doors" aria-hidden="true">
          <div className="facade-sign"><small>THE</small><strong>AURELIA</strong></div>
        </div>

        <button type="button" className="facade-window facade-women" onClick={onShopWomen}>
          <span className="window-eyebrow">02 · Second floor</span>
          <span className="window-heading">Women</span>
          <span className="window-tagline">Floral · New season · Every fragrance for her</span>
          <div className="window-art" aria-hidden="true">
            {womenBottles[0] && <PerfumeBottle tone={deriveTone(womenBottles[0].id)} image={womenBottles[0].image} alt="" />}
          </div>
          <span className="window-cta">Explore Women's <Icon name="arrowRight" size={14} /></span>
        </button>
      </section>

      <button type="button" className="boutique-doors-cta" onClick={onShopAll}>
        <span>Enter the boutique — shop the full collection</span>
        <Icon name="arrowRight" size={16} />
      </button>

      {menBottles.length > 0 && (
        <section className="boutique-bottles" aria-label="Featured for him">
          <div className="boutique-bottles-head"><p>WINDOW DISPLAY</p><h2>For him</h2></div>
          <div className="boutique-bottles-row">
            {menBottles.map((product) => (
              <BoutiqueBottle
                key={product.id}
                product={product}
                wishlisted={wishlist.includes(product.id)}
                onToggleWishlist={onToggleWishlist}
                onView={onViewProduct}
                onQuickAdd={onQuickAdd}
                mutating={mutating}
              />
            ))}
          </div>
        </section>
      )}

      {womenBottles.length > 0 && (
        <section className="boutique-bottles" aria-label="Featured for her">
          <div className="boutique-bottles-head"><p>WINDOW DISPLAY</p><h2>For her</h2></div>
          <div className="boutique-bottles-row">
            {womenBottles.map((product) => (
              <BoutiqueBottle
                key={product.id}
                product={product}
                wishlisted={wishlist.includes(product.id)}
                onToggleWishlist={onToggleWishlist}
                onView={onViewProduct}
                onQuickAdd={onQuickAdd}
                mutating={mutating}
              />
            ))}
          </div>
        </section>
      )}

      {brands.length > 0 && (
        <section className="boutique-brands" aria-label="Shop by house">
          <p>Shop by house</p>
          <div>
            {brands.map((house) => (
              <button key={house} type="button" onClick={() => onShopBrand(house)}>{house}</button>
            ))}
          </div>
        </section>
      )}

      <footer className="boutique-footer">
        <Logo />
        <p>Online · Always open</p>
        <div>
          <button type="button" onClick={onShopAll}>Full collection</button>
          <button type="button" onClick={onGoToGifts}>Gifts</button>
          <button type="button" onClick={onGoToPromise}>Aurelia Promise</button>
        </div>
      </footer>
    </div>
  );
}
