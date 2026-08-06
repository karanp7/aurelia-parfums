import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import PerfumeBottle from './PerfumeBottle.jsx';
import Badge from './Badge.jsx';
import Icon from './Icon.jsx';
import { findConcentration } from '../lib/shopifyProducts.js';

const money = (value) => `$${Number(value).toFixed(2).replace('.00', '')}`;

// Same $100 threshold the cart's free-shipping progress bar already uses —
// a real, consistent claim rather than a separate invented number.
const FREE_SHIPPING_THRESHOLD = 100;

// Card image hover-zoom/lift already exists as CSS :hover transitions
// (.product-image:hover .product-backdrop/.bottle-wrap/.product-photo,
// styles.css) and already respects the sitewide prefers-reduced-motion rule
// for free — duplicating that in Framer Motion risks two engines fighting
// over the same transform. Framer Motion is used here only for genuinely new
// interactions CSS :hover can't express as naturally: press feedback on
// Quick Add, a spring "pop" on the wishlist toggle, and (below) the inline
// multi-size picker's expand/collapse.
//
// This is THE single product card used everywhere a product tile renders
// (homepage Best Sellers, the Collection grid, the Scent Finder quiz
// results, and the product modal's related-products/recently-viewed rails)
// — every instance renders the identical design regardless of `size`.
// `size="rail"` only adjusts the card's own width/layout for the
// horizontal-scroll contexts (it sits in a flex row instead of a grid,
// so it needs a bounded width instead of filling a grid column) — it
// never changes which features render. `eyebrow` adds an optional small
// label above the image (e.g. the quiz's "Strongest match").
export default function ProductCard({ product, mutating, wishlisted, onToggleWishlist, onOpen, onQuickAdd, size = 'grid', eyebrow = null }) {
  const prefersReducedMotion = useReducedMotion();
  const [pickerOpen, setPickerOpen] = useState(false);
  const savingsAmount = product.compareAtPrice ? product.compareAtPrice - product.price : null;
  const savingsPercent = savingsAmount ? Math.round((savingsAmount / product.compareAtPrice) * 100) : null;
  const inStockSizes = product.sizes.filter((s) => s.availableForSale);

  // Real, not invented: sizes[0] is the exact variant `product.price` above
  // already comes from (see mapShopifyProduct), so the label shown here
  // always matches the price shown here. Concentration only ever shows if
  // a merchant actually set that variant option — same rule as the PDP.
  const primarySize = product.sizes[0];
  const concentration = findConcentration(product);
  const sizeLine = [concentration, primarySize?.label].filter(Boolean).join(' · ');

  const handleQuickAdd = () => {
    if (inStockSizes.length > 1) { setPickerOpen((open) => !open); return; }
    onQuickAdd(product, inStockSizes[0]?.label);
  };
  const pickSize = (label) => { setPickerOpen(false); onQuickAdd(product, label); };

  return (
    <article className={`product-card product-card--${size}`}>
      {eyebrow && <span className="card-eyebrow">{eyebrow}</span>}
      <div className="product-image">
        <button type="button" className="product-image-trigger" onClick={() => onOpen(product)} aria-label={`View ${product.name}`}>
          <div className={`product-backdrop tone-bg-${product.tone}`} />
          <div className="card-badges">
            {product.badge && <Badge>{product.badge}</Badge>}
            {product.price >= FREE_SHIPPING_THRESHOLD && <Badge tone="shipping">Free Shipping</Badge>}
          </div>
          <div className="bottle-wrap"><PerfumeBottle tone={product.tone} compact image={product.image} alt={product.imageAlt || product.name} /></div>
        </button>
        <button
          type="button"
          className="quick-add-pill"
          disabled={!product.availableForSale || mutating}
          aria-expanded={inStockSizes.length > 1 ? pickerOpen : undefined}
          aria-label={`Quick add ${product.name} to bag`}
          onClick={handleQuickAdd}
        >
          Quick add
        </button>
      </div>

      <motion.button
        className={`wishlist-btn${wishlisted ? ' active' : ''}`}
        aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        aria-pressed={wishlisted}
        onClick={() => onToggleWishlist(product.id)}
        animate={prefersReducedMotion ? undefined : { scale: wishlisted ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Icon name="heart" filled={wishlisted} size={16}/>
      </motion.button>

      <div className="product-info">
        <p>{product.house}</p>
        <h3>{product.name}</h3>
        {sizeLine && <span className="product-size-line">{sizeLine}</span>}
        <div>
          {/* No rating/review stars here by design: this store has no real
              rating data source anywhere, and inventing one would violate
              the site's never-fabricate-customer-facing-data rule. Hierarchy
              stops at price/savings, which is real. */}
          <div className="card-price">
            {product.availableForSale ? <>
              <span className="price-now-wrap">
                <strong>From {money(product.price)}</strong>
                {product.compareAtPrice && <s className="compare-price">{money(product.compareAtPrice)}</s>}
              </span>
              {product.compareAtPrice && <span className="savings-badge">Save {money(savingsAmount)} ({savingsPercent}%)</span>}
            </> : <strong>Sold out</strong>}
          </div>
          <AnimatePresence initial={false}>
            {pickerOpen && (
              <motion.div
                className="quick-size-picker"
                initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="sr-only" id={`size-picker-${product.id}`}>Choose a size for {product.name}</p>
                {inStockSizes.map((s) => (
                  <button key={s.variantId} disabled={mutating} onClick={() => pickSize(s.label)}>{s.label} — {money(s.price)}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </article>
  );
}
