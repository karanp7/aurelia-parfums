import React, { useState } from 'react';

// The one loading behavior every real photo across Aurelia should share:
// fade in once decoded, instead of popping in the instant bytes arrive.
// Deliberately just an <img> replacement, not a wrapping frame - parents
// already own their own radius/background/aspect-ratio (a grid card, a
// gallery thumbnail, and cart line art all differ on purpose) - this only
// standardizes how the pixels themselves arrive. Pairs with .stage-bg
// (see styles.css) on the parent for a blur-up-style placeholder: the
// shared --stage neutral shows through until the real photo fades over it.
export default function EditorialImage({ src, alt = '', loading = 'lazy', className = '', ...rest }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={`editorial-image${loaded ? ' is-loaded' : ''}${className ? ` ${className}` : ''}`.trim()}
      onLoad={() => setLoaded(true)}
      {...rest}
    />
  );
}
