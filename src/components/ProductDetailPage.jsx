import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Button from './Button.jsx';
import ProductCard from './ProductCard.jsx';
import ProductGallery from './ProductGallery.jsx';
import { useStickyOnScroll } from '../hooks/useStickyOnScroll.js';

const money = (value) => `$${Number(value).toFixed(2).replace('.00', '')}`;

// Same $100 threshold already used sitewide (announcement bar, trust row,
// ProductCard's own Free Shipping badge) — never a separate invented number.
const FREE_SHIPPING_THRESHOLD = 100;

// Real, not guessed: only shown if a merchant has actually configured a
// variant option literally named "Concentration" (e.g. "Eau de Parfum" vs
// "Eau de Toilette") — most stores won't have this set up, so it's simply
// omitted rather than inferring it from a size label or product title.
function findConcentration(product) {
  for (const size of product.sizes) {
    const match = (size.selectedOptions || []).find((option) => /concentration/i.test(option.name));
    if (match?.value) return match.value;
  }
  return null;
}

// Sticky offset for the purchase box: same fixed announcement-bar (36px) +
// nav (74px) stack as the Collection page's filter bar, plus a little extra
// breathing room since this box sits beside imagery rather than at the very
// top of a section.
const STICK_OFFSET = 130;

export default function ProductDetailPage({
  product, selectedSize, onSelectSize, mutating, addBottle, buyNow, onBack, onSampleFirst,
  relatedProducts, wishlist, toggleWishlist, openProduct
}) {
  const [quantity, setQuantity] = useState(1);
  const prefersReducedMotion = useReducedMotion();
  const { ref: boxRef, pinned, height: boxHeight, left: boxLeft, width: boxWidth } = useStickyOnScroll(STICK_OFFSET);

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
      <button type="button" className="back-link" onClick={onBack}>← Back to shop</button>
      <div className="product-modal">
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
                  <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                  <span>{quantity}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((q) => q + 1)}>+</button>
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
                  animate={prefersReducedMotion ? undefined : { scale: wishlisted ? [1, 1.3, 1] : 1 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span aria-hidden="true">{wishlisted ? '♥' : '♡'}</span>
                </motion.button>
              </div>

              <Button variant="text" onClick={onSampleFirst}>Sample it first in a matched set</Button>
              <p className="shipping-note">Ground-shipping availability and delivery estimates are confirmed at checkout.</p>
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div className="related-rail">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
