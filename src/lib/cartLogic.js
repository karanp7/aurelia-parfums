// Pure, framework-free logic extracted from App.jsx so it can be covered by
// plain Node tests (see /test) without needing a JSX/React test runner.

/**
 * Rank the catalog against quiz answers and return the top `limit` matches.
 *
 * Shopify-integration update: `product.rating`/`product.reviews` no longer
 * exist (they were fabricated placeholder data — see shopifyProducts.js).
 * The tiebreaker is now: in-stock products before sold-out ones, then
 * catalog order, so a tie never silently favors an unbuyable product.
 * Family/mood/intensity now come from real Shopify productType/tags
 * (mapShopifyProduct) rather than the old local catalog fields, but the
 * matching shape (`product.family`, `product.mood`, `product.intensityTag`)
 * is unchanged, so this still works the same way against real data —
 * `mood`/`intensityTag` are simply `null` until a merchant tags a product,
 * which just means that product can't score on that axis yet.
 */
export function rankMatches(products, quizAnswers, limit = 3) {
  const desiredFamily = quizAnswers[1];
  const desiredMood = quizAnswers[2];
  const desiredIntensity = quizAnswers[3];
  const scoreOf = (product) =>
    (product.family === desiredFamily ? 4 : 0) +
    (product.mood && product.mood === desiredMood ? 2 : 0) +
    (product.intensityTag && product.intensityTag === desiredIntensity ? 2 : 0);

  return products
    .map((product, catalogIndex) => ({ product, catalogIndex, score: scoreOf(product) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.product.availableForSale !== b.product.availableForSale) return a.product.availableForSale ? -1 : 1;
      return a.catalogIndex - b.catalogIndex;
    })
    .map((entry) => entry.product)
    .slice(0, limit);
}

/**
 * Build a stable, order-independent key for a set of matched fragrance
 * names. Used to detect "is this the same personalized discovery set
 * already in the Shopify cart" by comparing against the cart line's visible
 * "Matches" attribute, instead of a client-only id (P0 fix / Bug A —
 * two different quiz outcomes must never collide into one cart line).
 */
export function discoverySetKey(matchNames) {
  return matchNames.slice().sort().join('|');
}

/**
 * Pick the cross-sell product for a cart containing a personalized discovery
 * set. P0 fix (Bug B): reads the top-ranked match (matches[0], already
 * rank-ordered by the quiz) instead of whichever matched product happens to
 * appear first in the catalog's declaration order.
 */
export function crossSellProduct(products, discoveryMatches, fallback) {
  if (!discoveryMatches?.length) return fallback;
  return products.find((product) => product.name === discoveryMatches[0]) || fallback;
}
