// Client-only wishlist. There's no Shopify customer-account system wired up
// (this is a guest-checkout storefront), so "saved items" persist locally
// per browser rather than pretending to be a real account feature.

export const WISHLIST_STORAGE_KEY = 'aurelia:wishlist';

export function readWishlist(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(WISHLIST_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isWishlisted(productId, wishlist) {
  return wishlist.includes(productId);
}

/** Returns the next wishlist array — pure, so the caller decides how/when to persist it. */
export function toggleWishlistId(productId, wishlist) {
  return isWishlisted(productId, wishlist)
    ? wishlist.filter((id) => id !== productId)
    : [...wishlist, productId];
}

export function writeWishlist(wishlist, storage = localStorage) {
  storage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
}
