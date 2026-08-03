# Feedback-to-Implementation Changelog

## This pass — audit fixes + live Excel/image pipeline (see CLAUDE_START_HERE.md)

### P0 — fixed

1. **Bug A (discovery-set key collision).** `discoverySetKey()` (now in `src/lib/cartLogic.js`) derives the cart key from the sorted matched product IDs instead of a constant string. Retaking the quiz and adding a second, different discovery set now creates a separate cart line with its own `matches`, instead of silently merging into the first set's data. Covered by `test/cartLogic.test.js`.
2. **Bug B (cross-sell picked catalog order, not quiz rank).** `crossSellProduct()` reads `discovery.matches[0]` — the top-ranked quiz match — instead of `perfumes.find(...)`, which previously returned whichever matched product happened to be declared first in `perfumes.js`. Covered by a regression test using a discovery set whose top match is deliberately *not* first in the catalog.
3. **No focus trap / Escape / focus restoration on any modal.** Added a shared `useDialogA11y(isOpen, onClose)` hook in `src/App.jsx`, applied to all five overlays (product detail, quiz, cart, checkout preview, mobile menu). On open it moves focus into the dialog; Tab/Shift+Tab is trapped inside it; Escape closes it; on close, focus returns to whatever element opened it.
4. **Contrast failure on `--muted`.** Changed from `#746d66` (4.49:1 on paper, 4.20:1 on cream — both fail AA) to `#5f584f` (6.18:1 on paper, 5.77:1 on cream — verified against the WCAG formula in `src/styles.css`).

### P1 — fixed

5. **Gift wrap / gift message were inert.** Both are now real React state (`giftWrap`, `giftMessage`), gift wrap adds `$8` to the subtotal via `computeSubtotal()`, and the message persists while the cart drawer opens/closes.
6. **Quiz mood options didn't cover every catalog mood.** Added `Magnetic` and `Romantic` to the "how should it feel" question so Midnight Fig and Rose Obscura can reach a full match score. Also added a deliberate rating/review-count tiebreaker (`rankMatches()`) so ties no longer silently fall back to catalog declaration order.
7. **768px tablet nav gap.** The mobile-nav collapse breakpoint moved from `max-width:760px` to `max-width:800px`, so the common 768px tablet-portrait width reliably gets the compact hamburger nav instead of a cramped inline desktop nav.
8. **Toggle controls missing accessible state.** Family filter tabs and size-selector buttons now expose `aria-pressed`.
9. **Hero headline overflow at 320–375px.** Replaced the fixed `62px` size with `clamp(38px, 13vw, 62px)` plus `overflow-wrap`/`word-break`, applied at both the hero level and the shared heading selector.
10. **Font loading moved off render-blocking `@import`.** Google Fonts now load via `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html`, same font families (DM Sans, Italiana) as before.
11. **Minimum font-size floor.** Raised the smallest interface text (hero proof, trust-row labels, badges, note-pyramid labels, and similar 7–9px text) to a 10–11px floor sitewide.
12. **"Retake quiz" reset gift/self context.** `retakeQuiz()` now preserves `quizAnswers[0]` (Myself/Gift) and resets to step 1 instead of clearing everything and returning to step 0.

### Live Excel + image pipeline

- `scripts/import-products.mjs` reads `data/products.xlsx` (falling back to the first sheet if there's no `Products` sheet) and writes `src/data/perfumes.js` on every `npm run dev` / `npm run build`.
- Tolerant of `$`/comma-formatted prices, blank optional cells, and duplicate/missing IDs (auto-deduplicated, auto-slugified).
- Fails with a specific, row-numbered error when a product has no valid size price.
- `Image URL` takes priority over `Image File`; both are optional. `PerfumeBottle.jsx` falls back to the illustrated CSS bottle whenever no image is supplied or an image fails to load, in every context (grid, product modal, quiz results, cart).
- Warns (without failing the build) if a product's `Mood` isn't one of the quiz's answer options, since that product can then only be matched on family/intensity.
- Fixed a real bug in the xlsx dependency's ESM import surface: `readFile`/`writeFile` live on the package's default export in this version, not its named exports.

### Tests

Added `test/cartLogic.test.js` (`node --test`) covering: quiz ranking correctness, full-score reachability for every catalog mood, the rating/review tiebreaker, discovery-set key uniqueness and order-independence, cross-sell top-match selection, and cart subtotal with/without gift wrap. Run with `npm test`.

---

## Previous pass — strategic/business-model revision

### Implemented in the prototype

1. **Sample-first conversion path**
   - Hero now leads with trying three scents before buying a bottle.
   - Quiz result defaults to an $18 three-sample set.
   - Full $18 bottle-credit promise is explained with a 45-day window.

2. **Shipping and hazmat awareness**
   - All broad/fast/international shipping claims were removed.
   - Prototype states ground shipping within the contiguous U.S.
   - PDP, cart and policy sections state that carrier classification, packaging and dangerous-goods rules must be approved before launch.

3. **Returns policy corrected**
   - Unopened products, damaged/incorrect orders and preference-based opened products are treated separately.
   - Discovery sets are described as final sale with damaged-item replacement.

4. **Luxury direction made quieter**
   - Removed moving trust marquee.
   - Kept limited hero movement and reveal animation.
   - No particles, cursor trails or real-time 3D dependency.

5. **Gifting added**
   - Gift-specific homepage section.
   - "Gift" branch in the quiz.
   - Gift wrap, gift message, hidden-price receipt and gift-card concepts.

6. **Social proof improved**
   - Product cards show review totals.
   - Homepage and PDP include descriptive review language and preference context.

7. **Cart conversion mechanics added**
   - Quantities.
   - Free-ground-shipping threshold progress.
   - Guest-checkout language.
   - Gift message control.
   - Cross-sell favors sampling over another blind full bottle.

8. **Shopify decision made explicit**
   - Checkout button opens an implementation-boundary screen.
   - Production recommendation is Shopify Checkout + Shopify Admin, not a custom Stripe/order stack.

### Still intentionally not implemented

- Real Shopify Storefront API integration
- Shopify cart IDs and checkout URLs
- Real inventory, payments, taxes or orders
- Carrier-approved shipping rates or labels
- Bottle-credit code issuance/redemption
- Persistent cart and accounts
- Real product photography and CMS content (images can now be added via Excel, but none are supplied yet)
- Verified-review backend
- Legal review of policies
