import React, { useState } from 'react';
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

// Season isn't a real Shopify field today (no season facet exists
// anywhere - see shopifyProducts.js). Gender, Occasion and Concentration
// *are* real (a tag, a metafield and a variant option respectively) but
// only render as a live dropdown once at least one product in the
// catalog actually has that data set - PLACEHOLDER_FACETS is only ever
// the facet(s) that structurally cannot be real yet, not a fixed list.
const PLACEHOLDER_FACETS = ['Season'];

export { PRICE_BUCKETS, AVAILABILITY_OPTIONS };

export default function FilterBar({
  searchInputRef, search, onSearchChange, searchSuggestions = [], onSelectSuggestion,
  family, familyOptions, onFamilyChange,
  brand, brandOptions, onBrandChange,
  priceBucket, onPriceBucketChange,
  availabilityOnly, onAvailabilityChange,
  sizeFilter, sizeOptions, onSizeChange,
  gender, genderOptions = [], onGenderChange,
  occasion, occasionOptions = [], onOccasionChange,
  concentration, concentrationOptions = [], onConcentrationChange,
  newArrivalOnly, onNewArrivalChange,
  bestSellerOnly, onBestSellerChange,
  sort, sortOptions, onSortChange,
  activeFilterCount = 0, onOpenFilters, containerRef
}) {
  // Bounded to the Collection section itself (H-07): previously pinned
  // unbounded ("fine when the grid was the last thing on the page" - see
  // useStickyOnScroll's own comment), which stayed harmless while
  // Collection sat near the bottom. Now that Collection leads the
  // homepage, unbounded pinning kept the filter bar fixed across Best
  // Sellers/Mood/Gifts/Policies too - sections it has nothing to do with.
  const { ref: wrapRef, pinned, height: barHeight } = useStickyOnScroll(STICK_OFFSET, containerRef);
  const [searchFocused, setSearchFocused] = useState(false);
  const showSuggestions = searchFocused && search.trim().length > 0;

  return (
    <div ref={wrapRef} className={`filter-bar${pinned ? ' is-pinned' : ''}`} style={pinned ? { height: barHeight } : undefined}>
      <div className="filter-bar-inner">
      <div className="filter-bar-row filter-bar-primary">
        <label className="search-field">
          <span className="sr-only">Search fragrances</span>
          <Icon name="search"/>
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
            placeholder="Search rose, vanilla, oud, evening…"
            role="combobox"
            aria-expanded={showSuggestions && searchSuggestions.length > 0}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
          />
          {showSuggestions && searchSuggestions.length > 0 && (
            <ul className="search-suggestions" id="search-suggestions" role="listbox">
              {searchSuggestions.map((product) => (
                <li key={product.id} role="option">
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onSelectSuggestion(product)}>
                    <span className="search-suggestion-name">{product.name}</span>
                    <span className="search-suggestion-house">{product.house}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
        <div className="family-tabs" role="group" aria-label="Filter by fragrance family">
          <button className={family === 'All' ? 'active' : ''} aria-pressed={family === 'All'} onClick={() => onFamilyChange('All')}>All</button>
          {familyOptions.map((item) => <button key={item} className={family === item ? 'active' : ''} aria-pressed={family === item} onClick={() => onFamilyChange(item)}>{item}</button>)}
        </div>
        <div className="discovery-chips" role="group" aria-label="Discovery filters">
          <button type="button" className={`discovery-chip${bestSellerOnly ? ' active' : ''}`} aria-pressed={bestSellerOnly} onClick={() => onBestSellerChange(!bestSellerOnly)}>Best Sellers</button>
          <button type="button" className={`discovery-chip${newArrivalOnly ? ' active' : ''}`} aria-pressed={newArrivalOnly} onClick={() => onNewArrivalChange(!newArrivalOnly)}>New Arrivals</button>
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
        {genderOptions.length > 0 && (
          <Dropdown label="Gender" value={gender} onChange={onGenderChange} options={[{ value: 'All', label: 'All' }, ...genderOptions.map((item) => ({ value: item, label: item }))]} />
        )}
        {occasionOptions.length > 0 && (
          <Dropdown label="Occasion" value={occasion} onChange={onOccasionChange} options={[{ value: 'All', label: 'Any occasion' }, ...occasionOptions.map((item) => ({ value: item, label: item }))]} />
        )}
        {concentrationOptions.length > 0 && (
          <Dropdown label="Concentration" value={concentration} onChange={onConcentrationChange} options={[{ value: 'All', label: 'Any concentration' }, ...concentrationOptions.map((item) => ({ value: item, label: item }))]} />
        )}
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
