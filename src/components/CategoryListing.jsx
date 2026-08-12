import React, { useState } from 'react';
import Dropdown from './Dropdown.jsx';
import Icon from './Icon.jsx';
import Button from './Button.jsx';
import ProductCard from './ProductCard.jsx';
import FilterDrawer from './FilterDrawer.jsx';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import EmptyState from './EmptyState.jsx';
import { PRICE_BUCKETS, AVAILABILITY_OPTIONS } from './FilterBar.jsx';

// Native <details>/<summary> - a collapsible sidebar group with zero extra
// JS state, matching the Nike-style filter sidebar without hand-rolling an
// accordion.
function FilterGroup({ label, children }) {
  return (
    <details className="sidebar-filter-group" open>
      <summary><span>{label}</span><Icon name="chevronDown" size={13}/></summary>
      <div className="sidebar-filter-options">{children}</div>
    </details>
  );
}

function FilterOption({ active, onClick, children }) {
  return (
    <button type="button" className={`sidebar-filter-option${active ? ' active' : ''}`} aria-pressed={active} onClick={onClick}>
      <span className="sidebar-filter-check" aria-hidden="true">{active && <Icon name="check" size={11}/>}</span>
      <span>{children}</span>
    </button>
  );
}

// The product-listing page (H-09/H-10): a real sidebar-filter PLP used for
// both /men /women (a fixed pageGender - a real route, its own identity,
// Gender isn't a filter there) and the general "All Fragrances" homepage
// listing (pageGender is null - Gender becomes a real sidebar facet like
// any other, same real tag-derived data FilterBar used to expose). Every
// other facet (family/brand/price/availability/size/occasion/
// concentration/discovery/sort/search) is identical either way - only the
// heading and whether Gender appears in the sidebar change.
export default function CategoryListing({
  pageGender,
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
  onSaleOnly, onOnSaleChange,
  sort, sortOptions, onSortChange,
  activeFilterCount = 0, onClearFacets, onClearAll,
  filtered, visibleCount, onShowMore,
  productsLoading, productsError,
  mutating, wishlist, toggleWishlist, openProduct, addBottle,
  bestSellers = [],
  recentlyViewedProducts = [],
  filterDrawerOpen, onOpenFilters, onCloseFilters, filterDrawerDialogRef
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const showSuggestions = searchFocused && search.trim().length > 0;

  return (
    <div className="category-listing">
      <div className="category-listing-head">
        <h1>{pageGender ? `${pageGender}'s Fragrances` : 'All Fragrances'} <span className="category-count">({filtered.length})</span></h1>
        <label className="search-field category-search">
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
            aria-controls="category-search-suggestions"
          />
          {showSuggestions && searchSuggestions.length > 0 && (
            <ul className="search-suggestions" id="category-search-suggestions" role="listbox">
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
      </div>

      <div className="category-listing-toolbar">
        <button type="button" className="hide-filters-toggle" onClick={() => setSidebarOpen((open) => !open)}>
          {sidebarOpen ? 'Hide Filters' : 'Show Filters'}
        </button>
        <button type="button" className="filter-drawer-trigger" onClick={onOpenFilters}>
          Filters{activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
        </button>
        <Dropdown className="sort-dropdown" label="Sort by" value={sort} onChange={onSortChange} options={sortOptions} />
      </div>

      <div className={`category-listing-body${sidebarOpen ? '' : ' sidebar-hidden'}`}>
        <aside className="category-sidebar" aria-label="Filters">
          <div className="sidebar-filter-group-head">
            <p>Filters</p>
            {activeFilterCount > 0 && <button type="button" className="sidebar-clear" onClick={onClearFacets}>Clear all</button>}
          </div>

          <FilterGroup label="Discover">
            <FilterOption active={bestSellerOnly} onClick={() => onBestSellerChange(!bestSellerOnly)}>Best Sellers</FilterOption>
            <FilterOption active={newArrivalOnly} onClick={() => onNewArrivalChange(!newArrivalOnly)}>New Arrivals</FilterOption>
            <FilterOption active={onSaleOnly} onClick={() => onOnSaleChange(!onSaleOnly)}>On Sale</FilterOption>
          </FilterGroup>

          {!pageGender && genderOptions.length > 0 && (
            <FilterGroup label="Gender">
              <FilterOption active={gender === 'All'} onClick={() => onGenderChange('All')}>All</FilterOption>
              {genderOptions.map((item) => <FilterOption key={item} active={gender === item} onClick={() => onGenderChange(item)}>{item}</FilterOption>)}
            </FilterGroup>
          )}

          <FilterGroup label="Fragrance Family">
            <FilterOption active={family === 'All'} onClick={() => onFamilyChange('All')}>All</FilterOption>
            {familyOptions.map((item) => <FilterOption key={item} active={family === item} onClick={() => onFamilyChange(item)}>{item}</FilterOption>)}
          </FilterGroup>

          {occasionOptions.length > 0 && (
            <FilterGroup label="Occasion">
              <FilterOption active={occasion === 'All'} onClick={() => onOccasionChange('All')}>Any occasion</FilterOption>
              {occasionOptions.map((item) => <FilterOption key={item} active={occasion === item} onClick={() => onOccasionChange(item)}>{item}</FilterOption>)}
            </FilterGroup>
          )}

          {concentrationOptions.length > 0 && (
            <FilterGroup label="Concentration">
              <FilterOption active={concentration === 'All'} onClick={() => onConcentrationChange('All')}>Any concentration</FilterOption>
              {concentrationOptions.map((item) => <FilterOption key={item} active={concentration === item} onClick={() => onConcentrationChange(item)}>{item}</FilterOption>)}
            </FilterGroup>
          )}

          <FilterGroup label="Brand">
            <FilterOption active={brand === 'All'} onClick={() => onBrandChange('All')}>All brands</FilterOption>
            {brandOptions.map((item) => <FilterOption key={item} active={brand === item} onClick={() => onBrandChange(item)}>{item}</FilterOption>)}
          </FilterGroup>

          <FilterGroup label="Price">
            {PRICE_BUCKETS.map(({ value, label }) => <FilterOption key={value} active={priceBucket === value} onClick={() => onPriceBucketChange(value)}>{label}</FilterOption>)}
          </FilterGroup>

          <FilterGroup label="Availability">
            {AVAILABILITY_OPTIONS.map(({ value, label }) => (
              <FilterOption key={value} active={(availabilityOnly ? 'in-stock' : 'all') === value} onClick={() => onAvailabilityChange(value === 'in-stock')}>{label}</FilterOption>
            ))}
          </FilterGroup>

          {sizeOptions.length > 0 && (
            <FilterGroup label="Size">
              <FilterOption active={sizeFilter === 'All'} onClick={() => onSizeChange('All')}>All sizes</FilterOption>
              {sizeOptions.map((item) => <FilterOption key={item} active={sizeFilter === item} onClick={() => onSizeChange(item)}>{item}</FilterOption>)}
            </FilterGroup>
          )}
        </aside>

        <div className="category-listing-grid">
          {productsLoading ? <LoadingSkeleton count={8} />
            : productsError ? <EmptyState title="Couldn't load the catalog." description={productsError} />
            : filtered.length ? <>
            <div className="product-grid">
              {filtered.slice(0, visibleCount).map((product) => <ProductCard
                key={product.id}
                product={product}
                mutating={mutating}
                wishlisted={wishlist.includes(product.id)}
                onToggleWishlist={toggleWishlist}
                onOpen={openProduct}
                onQuickAdd={addBottle}
              />)}
            </div>
            {visibleCount < filtered.length && <div className="show-more-row">
              <Button variant="secondary" onClick={onShowMore}>Show more ({filtered.length - visibleCount} remaining)</Button>
            </div>}
          </> : <EmptyState
            title="No fragrances matched your filters."
            description="Try a different note, family or spelling."
            action={<Button variant="text" onClick={onClearAll}>Clear filters</Button>}
          >
            {bestSellers.length > 0 && <div className="no-results-recovery">
              <p className="overline dark">Popular right now</p>
              <div className="rail-row">
                {bestSellers.map((product) => <ProductCard
                  key={product.id}
                  product={product}
                  size="rail"
                  mutating={mutating}
                  wishlisted={wishlist.includes(product.id)}
                  onToggleWishlist={toggleWishlist}
                  onOpen={openProduct}
                  onQuickAdd={addBottle}
                />)}
              </div>
            </div>}
          </EmptyState>}
        </div>
      </div>

      {recentlyViewedProducts.length > 0 && <div className="recently-viewed-rail">
        <p className="overline dark">Recently viewed</p>
        <div className="rail-row">
          {recentlyViewedProducts.map((product) => <ProductCard
            key={product.id}
            product={product}
            size="rail"
            mutating={mutating}
            wishlisted={wishlist.includes(product.id)}
            onToggleWishlist={toggleWishlist}
            onOpen={openProduct}
            onQuickAdd={addBottle}
          />)}
        </div>
      </div>}

      {filterDrawerOpen && <FilterDrawer
        dialogRef={filterDrawerDialogRef}
        onClose={onCloseFilters}
        family={family} familyOptions={familyOptions} onFamilyChange={onFamilyChange}
        brand={brand} brandOptions={brandOptions} onBrandChange={onBrandChange}
        priceBucket={priceBucket} onPriceBucketChange={onPriceBucketChange}
        availabilityOnly={availabilityOnly} onAvailabilityChange={onAvailabilityChange}
        sizeFilter={sizeFilter} sizeOptions={sizeOptions} onSizeChange={onSizeChange}
        {...(!pageGender ? { gender, genderOptions, onGenderChange } : {})}
        occasion={occasion} occasionOptions={occasionOptions} onOccasionChange={onOccasionChange}
        concentration={concentration} concentrationOptions={concentrationOptions} onConcentrationChange={onConcentrationChange}
        newArrivalOnly={newArrivalOnly} onNewArrivalChange={onNewArrivalChange}
        bestSellerOnly={bestSellerOnly} onBestSellerChange={onBestSellerChange}
        onSaleOnly={onSaleOnly} onOnSaleChange={onOnSaleChange}
        onClear={onClearFacets}
        resultCount={filtered.length}
      />}
    </div>
  );
}
