// The horizontal filter bar this file used to export was replaced by
// CategoryListing's sidebar layout (H-10) - every listing page (home,
// /men, /women) uses that now. Kept as a lean facts-only module since
// CategoryListing/FilterDrawer both still import these two real,
// Shopify-data-derived facet definitions.
export const PRICE_BUCKETS = [
  { value: 'all', label: 'All prices', test: () => true },
  { value: 'under-100', label: 'Under $100', test: (price) => price < 100 },
  { value: '100-200', label: '$100 – $200', test: (price) => price >= 100 && price < 200 },
  { value: '200-plus', label: '$200+', test: (price) => price >= 200 }
];

export const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'All items' },
  { value: 'in-stock', label: 'In stock only' }
];
