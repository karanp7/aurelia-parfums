import React from 'react';

// Shimmer placeholder cards shown while the catalog loads, sized to match
// real product cards exactly by reusing .product-card/.product-image/
// .product-info (including their existing responsive breakpoints) with a
// .skeleton-shimmer modifier instead of duplicating layout rules.
export default function LoadingSkeleton({ count = 6 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <article className="product-card" key={index}>
          <div className="product-image skeleton-shimmer" />
          <div className="product-info">
            <div className="skeleton-line skeleton-line-sm" />
            <div className="skeleton-line skeleton-line-lg" />
            <div className="skeleton-line skeleton-line-md" />
          </div>
        </article>
      ))}
    </div>
  );
}
