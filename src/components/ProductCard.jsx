import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PerfumeBottle from './PerfumeBottle.jsx';
import Badge from './Badge.jsx';

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
// Quick Add and a spring "pop" on the wishlist toggle.
export default function ProductCard({ product, mutating, wishlisted, onToggleWishlist, onOpen, onQuickAdd }) {
  const prefersReducedMotion = useReducedMotion();
  const savingsAmount = product.compareAtPrice ? product.compareAtPrice - product.price : null;
  const savingsPercent = savingsAmount ? Math.round((savingsAmount / product.compareAtPrice) * 100) : null;
  const tapAnimation = prefersReducedMotion ? {} : { whileTap: { scale: 0.96 } };

  return (
    <article className="product-card">
      <button className="product-image" onClick={() => onOpen(product)} aria-label={`View ${product.name}`}>
        <div className={`product-backdrop tone-bg-${product.tone}`} />
        <div className="card-badges">
          {product.badge && <Badge>{product.badge}</Badge>}
          {product.price >= FREE_SHIPPING_THRESHOLD && <Badge tone="shipping">Free Shipping</Badge>}
        </div>
        <div className="bottle-wrap"><PerfumeBottle tone={product.tone} compact image={product.image} alt={product.imageAlt || product.name} /></div>
        <span className="view-hint">Explore fragrance</span>
      </button>

      <motion.button
        className={`wishlist-btn${wishlisted ? ' active' : ''}`}
        aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        aria-pressed={wishlisted}
        onClick={() => onToggleWishlist(product.id)}
        animate={prefersReducedMotion ? undefined : { scale: wishlisted ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <span aria-hidden="true">{wishlisted ? '♥' : '♡'}</span>
      </motion.button>

      <div className="product-info">
        <p>{product.house}</p>
        <h3>{product.name}</h3>
        <span>{product.summary}</span>
        <div>
          <div className="card-price">
            {product.availableForSale ? <>
              <strong>From {money(product.price)}</strong>
              {product.compareAtPrice && <>
                <s className="compare-price">{money(product.compareAtPrice)}</s>
                <span className="savings-note">Save {money(savingsAmount)} ({savingsPercent}%)</span>
              </>}
            </> : <strong>Sold out</strong>}
          </div>
          <div className="product-actions">
            <motion.button {...tapAnimation} disabled={!product.availableForSale || mutating} onClick={() => onQuickAdd(product)}>Quick add</motion.button>
            <button onClick={() => onOpen(product)}>Choose size <span aria-hidden="true">＋</span></button>
          </div>
        </div>
      </div>
    </article>
  );
}
