import React, { useState } from 'react';

export default function PerfumeBottle({ tone = 'rose', compact = false, image = '', alt = 'Perfume bottle' }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (image && !imageFailed) {
    // H-03 fix: product photos previously shipped as full-size PNGs only
    // (one was 1.16 MB). Every PNG imported from the Excel pipeline now has a
    // compressed WebP sibling generated alongside it — this prefers that and
    // falls back to the (also recompressed) PNG for browsers that don't
    // support WebP.
    const webp = image.replace(/\.png$/i, '.webp');
    return (
      <div className={`product-photo-shell tone-${tone} ${compact ? 'compact-photo' : ''}`}>
        <picture>
          <source srcSet={webp} type="image/webp" />
          <img
            className="product-photo"
            src={image}
            alt={alt}
            loading={compact ? 'lazy' : 'eager'}
            onError={() => setImageFailed(true)}
          />
        </picture>
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
