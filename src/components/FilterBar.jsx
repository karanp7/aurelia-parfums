import React from 'react';
import Dropdown from './Dropdown.jsx';
import Icon from './Icon.jsx';
import { useStickyOnScroll } from '../hooks/useStickyOnScroll.js';

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
  const { ref: wrapRef, pinned, height: barHeight } = useStickyOnScroll(STICK_OFFSET);

  return (
    <div ref={wrapRef} className={`filter-bar${pinned ? ' is-pinned' : ''}`} style={pinned ? { height: barHeight } : undefined}>
      <div className="filter-bar-inner">
      <div className="filter-bar-row filter-bar-primary">
        <label><span className="sr-only">Search fragrances</span><Icon name="search"/><input ref={searchInputRef} value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search rose, woods, fresh, evening…"/></label>
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
