import React from 'react';
import Dialog, { DialogClose } from './Dialog.jsx';
import Dropdown from './Dropdown.jsx';
import Button from './Button.jsx';
import { PRICE_BUCKETS, AVAILABILITY_OPTIONS } from './FilterBar.jsx';

const PLACEHOLDER_FACETS = ['Season'];

// Mobile-only bottom sheet holding every filter control (the same
// state/handlers FilterBar uses on desktop — nothing here is a separate
// filtering mechanism). Reuses the existing Dialog shell + useDialogA11y
// focus-trap pattern already powering the mobile menu/product modal/quiz/
// cart drawer, rather than a bespoke overlay - only the CSS positioning
// (see .filter-drawer-overlay/.filter-drawer in styles.css) changes it
// from a side panel into a bottom sheet on small screens.
export default function FilterDrawer({
  onClose, dialogRef,
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
  onClear, resultCount
}) {
  return (
    <Dialog overlayClassName="filter-drawer-overlay" label="Filter fragrances" dialogRef={dialogRef}>
      <div className="filter-drawer">
        <div className="filter-drawer-handle" aria-hidden="true" />
        <div className="filter-drawer-head"><h2>Filters</h2><DialogClose onClick={onClose} className="static" /></div>
        <div className="filter-drawer-body">
          <div className="filter-drawer-group">
            <p className="filter-drawer-label">Fragrance family</p>
            <div className="family-tabs" role="group" aria-label="Filter by fragrance family">
              <button className={family === 'All' ? 'active' : ''} aria-pressed={family === 'All'} onClick={() => onFamilyChange('All')}>All</button>
              {familyOptions.map((item) => <button key={item} className={family === item ? 'active' : ''} aria-pressed={family === item} onClick={() => onFamilyChange(item)}>{item}</button>)}
            </div>
          </div>
          <div className="filter-drawer-group">
            <p className="filter-drawer-label">Discover</p>
            <div className="discovery-chips" role="group" aria-label="Discovery filters">
              <button type="button" className={`discovery-chip${bestSellerOnly ? ' active' : ''}`} aria-pressed={bestSellerOnly} onClick={() => onBestSellerChange(!bestSellerOnly)}>Best Sellers</button>
              <button type="button" className={`discovery-chip${newArrivalOnly ? ' active' : ''}`} aria-pressed={newArrivalOnly} onClick={() => onNewArrivalChange(!newArrivalOnly)}>New Arrivals</button>
            </div>
          </div>
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
          <div className="filter-drawer-group">
            <p className="filter-drawer-label">Coming soon</p>
            <div className="filter-drawer-soon">
              {PLACEHOLDER_FACETS.map((facetLabel) => (
                <Dropdown key={facetLabel} disabled label={facetLabel} value="all" onChange={() => {}} options={[{ value: 'all', label: 'Any' }]} />
              ))}
            </div>
          </div>
        </div>
        <div className="filter-drawer-footer">
          <Button variant="secondary" onClick={onClear}>Clear all</Button>
          <Button onClick={onClose}>Show {resultCount} {resultCount === 1 ? 'result' : 'results'}</Button>
        </div>
      </div>
    </Dialog>
  );
}
