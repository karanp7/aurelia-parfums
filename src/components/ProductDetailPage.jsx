import React from 'react';
import Button from './Button.jsx';
import ProductCard from './ProductCard.jsx';
import ProductGallery from './ProductGallery.jsx';

const money = (value) => `$${Number(value).toFixed(2).replace('.00', '')}`;

// Product detail rendered as a real page inside <main> (App.jsx swaps its
// main content between this and the homepage sections based on whether the
// /products/:handle route is active) rather than as an overlay on top of
// the homepage — the overlay's focus-trap/body-scroll-lock no longer apply
// here since there's no backdrop to trap behind.
//
// This first milestone is a 1:1 content migration from the old modal (same
// fields, same size-selector/add-to-bag/related-rail behavior) - Gallery,
// Pricing, Purchase Box, Authenticity, etc. land in later milestones.
export default function ProductDetailPage({
  product, selectedSize, onSelectSize, mutating, addBottle, onBack, onSampleFirst,
  relatedProducts, wishlist, toggleWishlist, openProduct
}) {
  return (
    <div className="product-page">
      <button type="button" className="back-link" onClick={onBack}>← Back to shop</button>
      <div className="product-modal">
        <ProductGallery product={product} />
        <div className="modal-copy">
          <p className="overline dark">{product.house}</p>
          <h2>{product.name}</h2>
          <p className="plain-description">{product.description}</p>
          <fieldset className="size-selector">
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
          <div className="modal-actions">
            <Button disabled={mutating || !product.sizes.some((size) => size.availableForSale)} onClick={() => addBottle(product, selectedSize)}>Add to bag</Button>
            <Button variant="text" onClick={onSampleFirst}>Sample it first in a matched set</Button>
          </div>
          <p className="shipping-note">Ground-shipping availability and delivery estimates are confirmed at checkout.</p>
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
