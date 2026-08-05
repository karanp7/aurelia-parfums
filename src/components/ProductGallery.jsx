import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PerfumeBottle from './PerfumeBottle.jsx';

// Large hero + vertical thumbnail rail, built from the real Shopify
// `images[]` array (up to 5, already fetched — previously only images[0]
// was ever shown). Falls back to today's single-image behavior when a
// product only has one photo (no thumbnail rail rendered at all, matching
// the plain hero-only look products always had before this).
export default function ProductGallery({ product }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef(null);
  const images = product.images?.length ? product.images : [];
  const active = images[activeIndex] || { url: product.image, altText: product.imageAlt };

  // Switching products (a related-rail click, "Buy Now" from a different
  // item, etc.) should reopen the gallery on the first image, not whatever
  // index was active for the previous product.
  useEffect(() => setActiveIndex(0), [product.id]);

  const handleMouseMove = (event) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    heroRef.current.style.setProperty('--zoom-x', `${x}%`);
    heroRef.current.style.setProperty('--zoom-y', `${y}%`);
  };

  return (
    <div className="product-gallery">
      {images.length > 1 && (
        <div className="gallery-thumbs" role="tablist" aria-label={`${product.name} images`}>
          {images.map((image, index) => (
            <button
              key={image.url + index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'active' : ''}
              onClick={() => setActiveIndex(index)}
            >
              <img src={image.url} alt={image.altText || `${product.name} view ${index + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div className="gallery-hero" ref={heroRef} onMouseMove={handleMouseMove}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.url}
            className="gallery-hero-frame"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <PerfumeBottle tone={product.tone} image={active.url} alt={active.altText || product.imageAlt || product.name} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
