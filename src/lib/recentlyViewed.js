// Client-only "recently viewed" — same reasoning as wishlist.js: no
// Shopify customer-account system is wired up here, so this is a
// per-browser localStorage list, not a real account feature.

export const RECENTLY_VIEWED_STORAGE_KEY = 'aurelia:recently-viewed';
export const RECENTLY_VIEWED_LIMIT = 12;

export function readRecentlyViewed(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(RECENTLY_VIEWED_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Returns the next recently-viewed array (most-recent-first, deduped, capped) — pure, so the caller decides how/when to persist it. */
export function recordView(productId, recentlyViewed) {
  return [productId, ...recentlyViewed.filter((id) => id !== productId)].slice(0, RECENTLY_VIEWED_LIMIT);
}

export function writeRecentlyViewed(recentlyViewed, storage = localStorage) {
  storage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(recentlyViewed));
}
