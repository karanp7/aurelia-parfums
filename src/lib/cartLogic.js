// Pure, framework-free logic extracted from App.jsx so it can be covered by
// plain Node tests (see /test) without needing a JSX/React test runner.

export const GIFT_WRAP_PRICE = 8;

/**
 * Rank the catalog against quiz answers and return the top `limit` matches.
 * P0 fix (Bug B) + audit §12: ties on quiz score no longer silently fall back
 * to catalog declaration order — rating, then review count, are used as a
 * deliberate tiebreaker before finally falling back to catalog order.
 */
export function rankMatches(perfumes, quizAnswers, limit = 3) {
  const desiredFamily = quizAnswers[1];
  const desiredMood = quizAnswers[2];
  const scoreOf = (product) =>
    (product.family === desiredFamily ? 4 : 0) +
    (product.mood === desiredMood ? 2 : 0) +
    (quizAnswers[3] === 'Soft' && product.intensity <= 3 ? 2 : 0) +
    (quizAnswers[3] === 'Bold' && product.intensity >= 4 ? 2 : 0);

  return perfumes
    .map((product, catalogIndex) => ({ product, catalogIndex, score: scoreOf(product) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.product.rating !== a.product.rating) return b.product.rating - a.product.rating;
      if (b.product.reviews !== a.product.reviews) return b.product.reviews - a.product.reviews;
      return a.catalogIndex - b.catalogIndex;
    })
    .map((entry) => entry.product)
    .slice(0, limit);
}

/**
 * Build a stable cart key for a personalized discovery set based on the
 * actual matched product IDs. P0 fix (Bug A): previously this was a constant
 * string, so two different quiz outcomes collided into a single cart line.
 */
export function discoverySetKey(matches) {
  return `discovery-${matches.map((product) => product.id).sort().join('-')}`;
}

/**
 * Pick the cross-sell product for a cart containing a personalized discovery
 * set. P0 fix (Bug B): reads the top-ranked match (matches[0], already
 * rank-ordered by the quiz) instead of whichever matched product happens to
 * appear first in the catalog's declaration order.
 */
export function crossSellProduct(perfumes, discoveryMatches, fallback) {
  if (!discoveryMatches?.length) return fallback;
  return perfumes.find((product) => product.name === discoveryMatches[0]) || fallback;
}

/** Cart subtotal including gift wrap. */
export function computeSubtotal(cart, giftWrap) {
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return itemsTotal + (giftWrap ? GIFT_WRAP_PRICE : 0);
}
