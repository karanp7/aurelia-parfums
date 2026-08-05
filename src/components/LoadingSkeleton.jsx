import React from 'react';

// Shimmer placeholder cards shown while the catalog loads, sized to match
// real product cards exactly by reusing .product-card/.product-image/
// .product-info (including their existing responsive breakpoints) with a
// .skeleton-shimmer modifier instead of duplicating layout rules.
export default function LoadingSkeleton({ count = 8 }) {
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

// First-load-only placeholders for the Collection page's breadcrumb/header
// and filter bar (the family/brand/size options they'd otherwise show are
// themselves derived from `products`, so there's nothing real to render
// until the first fetch resolves). Reuses the same .skeleton-shimmer
// gradient/animation as the card skeleton above, just different shapes.
export function CollectionHeaderSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton-line skeleton-shimmer skeleton-breadcrumb" />
      <div className="skeleton-line skeleton-shimmer skeleton-heading" />
      <div className="skeleton-line skeleton-shimmer skeleton-subhead" />
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="filter-bar" aria-hidden="true">
      <div className="filter-bar-inner">
        <div className="filter-bar-row filter-bar-primary">
          <div className="skeleton-line skeleton-shimmer skeleton-pill skeleton-pill-lg" />
          <div className="skeleton-line skeleton-shimmer skeleton-pill skeleton-pill-md" />
          <div className="skeleton-line skeleton-shimmer skeleton-pill skeleton-pill-sm" />
        </div>
      </div>
    </div>
  );
}
