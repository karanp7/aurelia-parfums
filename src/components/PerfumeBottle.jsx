import React, { useEffect, useState } from 'react';

// Shopify's CDN resizes on the fly via a `width` query param on its own
// image URLs — this replaces the old build-time PNG->WebP pipeline (H-03),
// which only made sense for locally-hosted files, not Shopify CDN images.
function withWidth(url, width) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('width', width);
    return parsed.toString();
  } catch {
    return url;
  }
}

export default function PerfumeBottle({ tone = 'rose', compact = false, image = '', alt = 'Perfume bottle' }) {
  const [imageFailed, setImageFailed] = useState(false);

  // Switching products (e.g. the related-products rail inside the product
  // modal) reuses this same component instance — reset the failure flag so
  // a previous product's broken image doesn't stick to the next one.
  useEffect(() => setImageFailed(false), [image]);

  if (image && !imageFailed) {
    return (
      <div className={`product-photo-shell tone-${tone} ${compact ? 'compact-photo' : ''}`}>
        <img
          className="product-photo"
          src={withWidth(image, compact ? 400 : 900)}
          alt={alt}
          loading={compact ? 'lazy' : 'eager'}
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`bottle-scene tone-${tone} ${compact ? 'compact' : ''}`} aria-hidden="true">
      <div className="bottle-shadow" />
      <div className="bottle-cap" />
      <div className="bottle-neck" />
      <div className="bottle-body">
        <div className="bottle-glow" />
        <div className="bottle-label">
          <span>AURELIA</span>
          <small>EAU DE PARFUM</small>
        </div>
      </div>
    </div>
  );
}
