import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Button from './Button.jsx';
import ProductCard from './ProductCard.jsx';
import ProductGallery from './ProductGallery.jsx';
import Icon from './Icon.jsx';
import { useStickyOnScroll } from '../hooks/useStickyOnScroll.js';
import { findConcentration } from '../lib/shopifyProducts.js';

const money = (value) => `$${Number(value).toFixed(2).replace('.00', '')}`;

// Same $100 threshold already used sitewide (announcement bar, trust row,
// ProductCard's own Free Shipping badge) — never a separate invented number.
const FREE_SHIPPING_THRESHOLD = 100;

// Sticky offset for the purchase box: same fixed announcement-bar (36px) +
// nav (74px) stack as the Collection page's filter bar, plus a little extra
// breathing room since this box sits beside imagery rather than at the very
// top of a section.
const STICK_OFFSET = 130;

// Every claim below already exists verbatim elsewhere on the site
// (announcement bar, trust row, policies) - reused here rather than
// restated with different wording/numbers, so the site never makes two
// slightly different promises about the same thing.
const NOTE_TIERS = [
  { key: 'top', label: 'Top Notes' },
  { key: 'heart', label: 'Heart Notes' },
  { key: 'base', label: 'Base Notes' }
];

const PERFORMANCE_METRICS = [
  { key: 'longevity', label: 'Longevity' },
  { key: 'projection', label: 'Projection' },
  { key: 'versatility', label: 'Versatility' }
];

function StarRating({ value }) {
  return (
    <span className="performance-stars" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Icon key={index} name="star" filled={index < Math.round(value)} size={16}/>
      ))}
    </span>
  );
}

const WHY_BUY_ITEMS = [
  '100% Authentic Guarantee',
  'Free Shipping on Orders $100+',
  'Fast, Fragrance-Safe U.S. Shipping',
  '30-Day Easy Returns',
  'Secure Shopify Checkout — No Account Required'
];

// The sticky purchase box's short trust list and the dedicated Why Buy
// section below describe the identical 5 facts on the same page — one
// array instead of two independently-worded lists that can drift apart.
const TRUST_ITEMS = WHY_BUY_ITEMS;

export default function ProductDetailPage({
  product, selectedSize, onSelectSize, mutating, addBottle, buyNow, onBack, onSampleFirst,
  relatedProducts, recentlyViewedProducts, wishlist, toggleWishlist, openProduct
}) {
  const [quantity, setQuantity] = useState(1);
  const prefersReducedMotion = useReducedMotion();
  const productModalRef = useRef(null);
  // Bounded to .product-modal (the two-column gallery+info area) so the box
  // stops pinning once that area has scrolled past, instead of floating
  // over the full-width Authenticity/Why Buy/Reviews content below it.
  const { ref: boxRef, pinned, height: boxHeight, left: boxLeft, width: boxWidth } = useStickyOnScroll(STICK_OFFSET, productModalRef);

  // A fresh product page starts at quantity 1, not whatever was left over
  // from the last product viewed.
  useEffect(() => setQuantity(1), [product.id]);

  const selected = product.sizes.find((size) => size.label === selectedSize) || product.sizes[0];
  const concentration = findConcentration(product);
  const wishlisted = wishlist.includes(product.id);
  const inStock = product.sizes.some((size) => size.availableForSale);
  const savingsAmount = selected?.compareAtPrice ? selected.compareAtPrice - selected.price : null;
  const savingsPercent = savingsAmount ? Math.round((savingsAmount / selected.compareAtPrice) * 100) : null;

  const tapAnimation = prefersReducedMotion ? {} : { whileTap: { scale: 0.96 } };
  // CSS custom properties, not inline position/left/width — the actual
  // `position: fixed` only applies above the tablet breakpoint (see
  // styles.css), so mobile/tablet ignore this desktop-only pinning
  // entirely rather than fighting the separate mobile sticky add-to-cart
  // bar. An inline `position` here would win over any media query.
  const pinnedStyle = pinned ? { '--pin-top': `${STICK_OFFSET}px`, '--pin-left': `${boxLeft}px`, '--pin-width': `${boxWidth}px` } : undefined;

  return (
    <div className="product-page">
      <button type="button" className="back-link" onClick={onBack}><Icon name="arrowLeft" size={14}/> Back to shop</button>
      <div className="product-modal" ref={productModalRef}>
        <ProductGallery product={product} />
        <div className="modal-copy">
          <p className="overline dark">{product.house}</p>
          <h2>{product.name}</h2>
          {concentration && <p className="pdp-concentration">{concentration}</p>}
          <p className="plain-description">{product.description}</p>

          <div ref={boxRef} className="pdp-purchase-box-wrap" style={pinned ? { '--pin-placeholder-height': `${boxHeight}px` } : undefined}>
            <div className={`pdp-purchase-box${pinned ? ' is-pinned' : ''}`} style={pinnedStyle}>
              {selected && (
                <div className="pdp-pricing">
                  {selected.compareAtPrice ? (
                    <>
                      <div className="pdp-price-row">
                        <span className="pdp-price-label">Retail</span>
                        <s className="pdp-retail-price">{money(selected.compareAtPrice)}</s>
                      </div>
                      <div className="pdp-price-row">
                        <span className="pdp-price-label">Our Price</span>
                        <strong className="pdp-our-price">{money(selected.price)}</strong>
                      </div>
                      <div className="pdp-price-row pdp-savings">
                        <span className="pdp-price-label">You Save</span>
                        <span>{money(savingsAmount)} ({savingsPercent}%)</span>
                      </div>
                    </>
                  ) : (
                    <strong className="pdp-our-price">{money(selected.price)}</strong>
                  )}
                  {selected.price >= FREE_SHIPPING_THRESHOLD && <p className="pdp-free-shipping">Free shipping on this order</p>}
                </div>
              )}

              <fieldset className="size-selector pdp-size-selector">
                <legend>Choose size</legend>
                {product.sizes.map((size) => (
                  <button
                    key={size.variantId}
                    disabled={!size.availableForSale}
                    className={selectedSize === size.label ? 'selected' : ''}
                    aria-pressed={selectedSize === size.label}
                    onClick={() => onSelectSize(size.label)}
                  >
                    <span>{size.label}{!size.availableForSale ? ' · Sold out' : ''}</span>
                    <strong>{money(size.price)}</strong>
                  </button>
                ))}
              </fieldset>

              <div className="pdp-quantity">
                <span className="pdp-quantity-label">Quantity</span>
                <div className="quantity">
                  <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Icon name="minus" size={12}/></button>
                  <span>{quantity}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((q) => q + 1)}><Icon name="plus" size={12}/></button>
                </div>
              </div>

              <div className="pdp-actions">
                <motion.button
                  {...tapAnimation}
                  className="btn btn-dark full"
                  disabled={mutating || !inStock}
                  onClick={() => addBottle(product, selectedSize, quantity)}
                >
                  Add to Bag
                </motion.button>
                <motion.button
                  {...tapAnimation}
                  className="btn btn-outline full"
                  disabled={mutating || !inStock}
                  onClick={() => buyNow(product, selectedSize, quantity)}
                >
                  Buy Now
                </motion.button>
                <motion.button
                  className={`wishlist-btn pdp-wishlist-btn${wishlisted ? ' active' : ''}`}
                  aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                  aria-pressed={wishlisted}
                  onClick={() => toggleWishlist(product.id)}
                  animate={prefersReducedMotion ? undefined : { scale: wishlisted ? [1, 1.12, 1] : 1 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Icon name="heart" filled={wishlisted} size={18}/>
                </motion.button>
              </div>

              <Button variant="text" onClick={onSampleFirst}>Sample it first in a matched set</Button>
              <p className="shipping-note">Ground-shipping availability and delivery estimates are confirmed at checkout.</p>

              <ul className="pdp-trust-list">
                {TRUST_ITEMS.map((item) => (
                  <li key={item}><Icon name="check" size={13}/> {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only (see styles.css - hidden entirely above the tablet
          breakpoint). Reuses the same `pinned` boolean already computed
          for the desktop sticky purchase box above: it's true whenever
          scrolled past the purchase box's position and before the
          two-column area's bottom, on any viewport width - only the CSS
          differs per breakpoint (desktop pins the whole box in place;
          mobile shows this compact bar instead, so the two treatments
          never compete for the same space). */}
      {pinned && selected && (
        <div className="mobile-sticky-bar">
          <div className="mobile-sticky-info">
            <span className="mobile-sticky-name">{product.name}</span>
            <span className="mobile-sticky-meta">{money(selected.price)}{selectedSize ? ` · ${selectedSize}` : ''}</span>
          </div>
          <button
            type="button"
            className="btn btn-dark"
            disabled={mutating || !inStock}
            onClick={() => addBottle(product, selectedSize, quantity)}
          >
            Add to Bag
          </button>
        </div>
      )}

      {(product.notes.top.length > 0 || product.notes.heart.length > 0 || product.notes.base.length > 0) && (
        <section className="pyramid-section">
          <div className="section-intro">
            <p className="overline dark">Fragrance Pyramid</p>
            <h2>How it unfolds.</h2>
          </div>
          <div className="note-pyramid">
            {NOTE_TIERS.map(({ key, label }) => product.notes[key].length > 0 && (
              <span key={key}>
                <small>{label}</small>
                {product.notes[key].join(', ')}
              </span>
            ))}
          </div>
        </section>
      )}

      {(product.performance.longevity != null || product.performance.projection != null || product.performance.versatility != null || product.occasions.length > 0) && (
        <section className="performance-section">
          <div className="section-intro">
            <p className="overline dark">Performance</p>
            <h2>How it wears.</h2>
          </div>
          {(product.performance.longevity != null || product.performance.projection != null || product.performance.versatility != null) && (
            <div className="performance-grid">
              {PERFORMANCE_METRICS.map(({ key, label }) => product.performance[key] != null && (
                <div key={key} className="performance-card">
                  <span>{label}</span>
                  <StarRating value={product.performance[key]} />
                </div>
              ))}
            </div>
          )}
          {product.occasions.length > 0 && (
            <div className="occasion-chips">
              {product.occasions.map((occasion) => <span key={occasion} className="occasion-chip">{occasion}</span>)}
            </div>
          )}
        </section>
      )}

      <section className="authenticity-section">
        <div className="section-intro">
          <p className="overline dark">Authenticity</p>
          <h2>Every bottle. 100% genuine.</h2>
        </div>
        <div className="journey-grid">
          <article>
            <span>01</span>
            <h3>Trusted, authorized sourcing</h3>
            <p>Every fragrance is sourced through trusted, authorized channels — never grey-market or unverified sellers.</p>
          </article>
          <article>
            <span>02</span>
            <h3>See exactly what you'll receive</h3>
            <p>Product photography comes directly from real inventory — no stock images, no guesswork about what arrives.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Backed by our return policy</h3>
            <p>Unopened bottles are eligible for return within 30 days when unused, sealed and in original condition.</p>
          </article>
        </div>
      </section>

      <section className="why-buy-section">
        <p className="overline dark">Why buy from Aurelia</p>
        <div className="why-buy-grid">
          {WHY_BUY_ITEMS.map((item) => (
            <div key={item} className="why-buy-item"><Icon name="check" size={13}/> {item}</div>
          ))}
        </div>
      </section>

      {/* Visible shell, unlike Testimonials/Instagram (which render nothing
          when empty) - there is genuinely no reviews app connected to
          Shopify yet, so this is an honest "nothing here yet" state rather
          than fabricated stars/quotes. Sort controls (Highest/Newest/
          Lowest) only make sense once there's real data to sort, so they
          stay out until then instead of shipping dead UI. */}
      <section className="reviews-section">
        <div className="section-intro">
          <p className="overline dark">Reviews</p>
          <h2>Customer reviews.</h2>
        </div>
        <p className="reviews-empty">No reviews yet for this fragrance.</p>
      </section>

      {relatedProducts.length > 0 && (
        <section className="rail-section related-rail">
          <p className="overline dark">You may also like</p>
          <div className="rail-row">
            {relatedProducts.map((related) => (
              <ProductCard
                key={related.id}
                product={related}
                size="rail"
                mutating={mutating}
                wishlisted={wishlist.includes(related.id)}
                onToggleWishlist={toggleWishlist}
                onOpen={openProduct}
                onQuickAdd={addBottle}
              />
            ))}
          </div>
        </section>
      )}

      {recentlyViewedProducts.length > 0 && (
        <section className="rail-section recently-viewed-rail">
          <p className="overline dark">Recently viewed</p>
          <div className="rail-row">
            {recentlyViewedProducts.map((viewed) => (
              <ProductCard
                key={viewed.id}
                product={viewed}
                size="rail"
                mutating={mutating}
                wishlisted={wishlist.includes(viewed.id)}
                onToggleWishlist={toggleWishlist}
                onOpen={openProduct}
                onQuickAdd={addBottle}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
