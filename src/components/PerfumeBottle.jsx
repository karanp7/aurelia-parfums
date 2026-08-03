import React, { useState } from 'react';

export default function PerfumeBottle({ tone = 'rose', compact = false, image = '', alt = 'Perfume bottle' }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (image && !imageFailed) {
    return (
      <div className={`product-photo-shell tone-${tone} ${compact ? 'compact-photo' : ''}`}>
        <img
          className="product-photo"
          src={image}
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
