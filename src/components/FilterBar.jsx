import React, { useEffect, useRef, useState } from 'react';
import Dropdown from './Dropdown.jsx';

// Matches the fixed announcement bar (36px) + nav (74px) stack elsewhere in
// the app.
const STICK_OFFSET = 110;

// Real, functional facets - all derived from actual Shopify product data
// (see PLACEHOLDER_FACETS below for the honest opposite case).
const PRICE_BUCKETS = [
  { value: 'all', label: 'All prices', test: () => true },
  { value: 'under-100', label: 'Under $100', test: (price) => price < 100 },
  { value: '100-200', label: '$100 – $200', test: (price) => price >= 100 && price < 200 },
  { value: '200-plus', label: '$200+', test: (price) => price >= 200 }
];

const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'All items' },
  { value: 'in-stock', label: 'In stock only' }
];

// Gender/Season/Occasion/Concentration aren't real Shopify fields today (no
// gender field, no season/occasion facet, no parsed EDT/EDP distinction -
// see shopifyProducts.js). Shown visibly rather than hidden so the filter
// bar communicates the full intended shape, but disabled with a "Coming
// soon" tooltip rather than wired to fake data.
const PLACEHOLDER_FACETS = ['Gender', 'Season', 'Occasion', 'Concentration'];

export { PRICE_BUCKETS, AVAILABILITY_OPTIONS };

export default function FilterBar({
  searchInputRef, search, onSearchChange,
  family, familyOptions, onFamilyChange,
  brand, brandOptions, onBrandChange,
  priceBucket, onPriceBucketChange,
  availabilityOnly, onAvailabilityChange,
  sizeFilter, sizeOptions, onSizeChange,
  sort, sortOptions, onSortChange,
  activeFilterCount = 0, onOpenFilters
}) {
  // CSS `position: sticky` can't work here — .site-shell (the app's outer
  // wrapper, needed so decorative absolutely-positioned hero elements never
  // cause horizontal scroll) has `overflow: hidden`, which disables sticky
  // for every descendant per spec. The nav already works around this the
  // same way: track scroll position in JS and toggle real `position: fixed`
  // once the bar's natural position scrolls past the fixed header stack,
  // with a same-height placeholder so content doesn't jump.
  const wrapRef = useRef(null);
  const naturalTopRef = useRef(null);
  const [pinned, setPinned] = useState(false);
  const [barHeight, setBarHeight] = useState(0);

  useEffect(() => {
    // Keep re-measuring on every tick while unpinned — async image/webfont
    // loads shift layout well after mount, so a one-time measurement goes
    // stale and pins prematurely (confirmed via a Playwright repro: pinning
    // fired ~450px before the bar had actually scrolled near the header).
    // Freeze the reference the instant it pins so a fixed element's own
    // ever-growing getBoundingClientRect().top doesn't corrupt it.
    const measure = () => {
      if (!wrapRef.current) return;
      naturalTopRef.current = wrapRef.current.getBoundingClientRect().top + window.scrollY;
      setBarHeight(wrapRef.current.offsetHeight);
    };
    const onScroll = () => {
      if (!pinned) measure();
      if (naturalTopRef.current == null) return;
      setPinned(window.scrollY + STICK_OFFSET >= naturalTopRef.current);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pinned]);

  return (
    <div ref={wrapRef} className={`filter-bar${pinned ? ' is-pinned' : ''}`} style={pinned ? { height: barHeight } : undefined}>
      <div className="filter-bar-inner">
      <div className="filter-bar-row filter-bar-primary">
        <label><span className="sr-only">Search fragrances</span><span aria-hidden="true">⌕</span><input ref={searchInputRef} value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search rose, woods, fresh, evening…"/></label>
        <div className="family-tabs" role="group" aria-label="Filter by fragrance family">
          <button className={family === 'All' ? 'active' : ''} aria-pressed={family === 'All'} onClick={() => onFamilyChange('All')}>All</button>
          {familyOptions.map((item) => <button key={item} className={family === item ? 'active' : ''} aria-pressed={family === item} onClick={() => onFamilyChange(item)}>{item}</button>)}
        </div>
        <button type="button" className="filter-drawer-trigger" onClick={onOpenFilters}>
          Filters{activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
        </button>
        <Dropdown className="sort-dropdown" label="Sort by" value={sort} onChange={onSortChange} options={sortOptions} />
      </div>

      <div className="filter-bar-row filter-bar-facets">
        <Dropdown label="Brand" value={brand} onChange={onBrandChange} options={[{ value: 'All', label: 'All brands' }, ...brandOptions.map((item) => ({ value: item, label: item }))]} />
        <Dropdown label="Price" value={priceBucket} onChange={onPriceBucketChange} options={PRICE_BUCKETS.map(({ value, label }) => ({ value, label }))} />
        <Dropdown label="Availability" value={availabilityOnly ? 'in-stock' : 'all'} onChange={(value) => onAvailabilityChange(value === 'in-stock')} options={AVAILABILITY_OPTIONS} />
        <Dropdown label="Size" value={sizeFilter} onChange={onSizeChange} options={[{ value: 'All', label: 'All sizes' }, ...sizeOptions.map((item) => ({ value: item, label: item }))]} />
        <div className="filter-bar-soon" aria-label="Coming soon filters">
          {PLACEHOLDER_FACETS.map((facetLabel) => (
            <Dropdown key={facetLabel} disabled label={facetLabel} value="all" onChange={() => {}} options={[{ value: 'all', label: 'Any' }]} />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
