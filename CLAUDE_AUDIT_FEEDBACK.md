# Aurelia Parfums — Prototype Audit
*Reviewed as: luxury ecommerce product lead, CRO specialist, senior React engineer, Shopify solutions architect, accessibility specialist, mobile performance engineer, and fragrance ops reviewer.*

## How this was tested

The interactive HTML demo depends on `unpkg.com` for React, ReactDOM, and Babel Standalone. This sandbox's network egress does not allow `unpkg.com` (confirmed: a direct request returned `HTTP 403`), so the demo could not be executed as a live browser page. Per your instructions, this is logged as a sandbox limitation, not a product defect.

Instead, the consolidated source bundle was reconstructed into a real project (`package.json`, `src/App.jsx`, `src/data/perfumes.js`, `src/components/PerfumeBottle.jsx`, `src/styles.css`) and verified with actual execution wherever possible:

- **Real build**: `npm install && npm run build` — ran to completion.
- **Real logic tests**: the quiz-scoring, cart-merge, and cross-sell functions were extracted and run against the actual product data in Node to confirm specific bugs empirically rather than by inspection alone.
- **Real contrast math**: every color pair in the CSS was checked against WCAG formulas, not eyeballed.
- **Static reading**: layout at specific pixel widths, focus management, and Shopify-readiness were assessed by tracing the actual CSS/JSX, since no real browser was available to screenshot. These findings are marked accordingly below.

---

## 1. Executive verdict

This is a strong second pass. It faithfully implements essentially everything from the prior strategic critique — sample-first flow, gifting, guest checkout, hazmat-aware shipping language, quieter motion, tiered returns, and an explicit Shopify handoff boundary. The business logic is sound and the build is clean.

What holds it back from "ready to hand to an engineering team" is a small number of real state-management bugs that would quietly undermine the personalization the whole concept is built on, a complete absence of keyboard/focus handling across every modal, and a couple of measured accessibility and performance issues. None of this is hard to fix — most of it is a few hours of work — but it should be fixed before this becomes the reference implementation for the Next.js build.

## 2. What worked when tested

- **Clean production build.** `vite build` completed with no errors: 26 modules transformed, 215 KB JS / 66.9 KB gzipped, 23.9 KB CSS / 6.0 KB gzipped.
- **React fundamentals are solid.** Every `.map()` has a correct, stable `key`; all `useEffect` calls with subscriptions (scroll listener, `IntersectionObserver`, body-scroll lock) return proper cleanup functions; no `dangerouslySetInnerHTML` anywhere; optional chaining is used defensively where data might be absent (`discovery.matches?.includes(...)`).
- **Search/filter logic is correct** and reasonably thorough — matches across name, house, family, secondary family, summary, and all three note tiers.
- **Free-shipping progress math is correct** (`Math.max`/`Math.min` clamped properly).
- **The conceptual pivot is complete and consistent** — every item in your own changelog is genuinely present in the code, not just the copy.

## 3. Bugs and broken interactions, with reproduction steps

**Bug A — Retaking the quiz silently overwrites your first personalized discovery set (confirmed by execution).**
Repro: Take the quiz, get matched to [Santal Ember, Midnight Fig, Velvet Iris], add the set. Retake the quiz with different answers, get matched to [Neroli Coast, Vanille Suède, Rose Obscura], add the set again.
Result (verified by running the actual reducer logic): the cart shows **quantity: 2** for "Your Personal Discovery Set," but the `matches` field — which drives what the cart line displays — still shows only the *first* quiz result. The customer is charged for two different personalized sets but the UI (and whatever a fulfillment picker reads) only ever shows one set of three names.
Cause: `addItem`'s cart key for a discovery set is always `discovery-personal-discovery-set-3 × 2 ml each`, regardless of which products matched, so two different quiz outcomes collide into the same line and the merge logic (`{...entry, quantity: entry.quantity + 1}`) keeps the *first* entry's data.
Fix: give each personalized set a key derived from its actual matches (shown in §16).

**Bug B — The cart's cross-sell suggestion is not necessarily your top quiz match (confirmed by execution).**
Repro: quiz determines strongest match = Santal Ember, second = Midnight Fig, weakest/"adventurous" = Velvet Iris. Add the discovery set, open the cart.
Result (verified): the cross-sell panel suggests **Velvet Iris** — the *weakest* match — not Santal Ember.
Cause: `perfumes.find((product) => discovery.matches?.includes(product.name))` returns whichever matched product appears first in the **catalog's declaration order**, not the quiz's rank order. Velvet Iris happens to be declared first in `perfumes.js`, so it wins regardless of actual match strength. This directly undercuts the "we intelligently recommend" promise the copy makes right above it.
Fix: read `discovery.matches[0]` specifically (the array is already rank-ordered by the quiz) — shown in §16.

**Bug C — Gift wrap and gift message are visually present but functionally inert.**
The gift-wrap checkbox and gift-message textarea have no `value`/`checked` or `onChange` — they're uncontrolled and unconnected to any state. Checking the box does not add $8 to the subtotal; typing a message captures nothing. Your changelog already flags gift-wrap pricing as intentionally deferred, but the message field silently losing its content isn't called out anywhere, so flagging it here in case it wasn't a deliberate omission.

**Bug D — Two of six products can never reach their full match score (confirmed by execution).**
The quiz's "how should it feel" question offers `['Elegant', 'Confident', 'Energizing', 'Comforting']`, but two products in the catalog have moods of `'Magnetic'` (Midnight Fig) and `'Romantic'` (Rose Obscura) — moods a quiz-taker can never select. Running the actual scoring function confirms both products are capped at 6 points (family + intensity) versus the 8 points a fully-matched product can reach, even in a scenario where they'd otherwise be the ideal answer. Not fatal — they can still surface on family/intensity alone — but it's a real gap between the data model and the quiz's option set.

**Minor — "Retake quiz" resets the gift/self context.** Clicking "Retake quiz" from the result screen resets `quizStep` to 0 and clears all answers, including the Myself/Gift selection from step 0. A gift shopper who wants to try different notes has to re-declare they're shopping for a gift. Low priority, but worth a one-line fix (reset to step 1, preserve `quizAnswers[0]`) if you're already in that code.

## 4. Conversion blockers ranked by impact

1. **Bug B (wrong cross-sell)** is the highest-impact issue in this list — it's a trust problem, not just a display bug. A fragrance-discovery business whose entire pitch is "we understand your preferences" showing the customer's *least* favorite match as the recommended next step actively works against the sample-first thesis.
2. **No focus trap / no Escape-to-close on any modal** (detailed in §7) is a real conversion blocker for keyboard and screen-reader users specifically, not a nice-to-have — every single purchase path (quiz, PDP, cart, checkout handoff) routes through a modal.
3. **Gift wrap/message being inert** (Bug C) matters commercially because gifting was identified as a meaningful revenue lever; right now it's a placebo control that could produce support tickets from customers who believe they added a message that never arrives.
4. **Bug A** matters most for repeat/gift shoppers specifically — exactly the segment the sample-first model is trying to convert twice (once for themselves, once as a gift).
5. **Contrast failures on the most-used secondary text color** (§7) affect legibility of product summaries and descriptions sitewide — this is baseline usability, not polish.

## 5. UX and visual-design critique

The direction is right — restrained motion, static trust row instead of a marquee, editorial type scale, sample-first hero copy. Two things worth real attention before this reads as fully "yours":

- **The palette risks reading as a generic AI-generated template to a design-literate buyer.** Your background paper color is `#f5f0e8`, within a few points of the specific warm-cream-plus-high-contrast-serif combination that's become a recognizable pattern in AI-assisted design right now. Your wine accent (`#6f1f35`) already diverges from that pattern in a good way, but the cream base plus the Italiana display serif together land close enough to it that a design-savvy visitor — exactly the kind of person shopping a $150+ niche fragrance — could register it as templated rather than bespoke. Two low-effort fixes: shift the paper tone slightly warmer/muddier away from that specific hex, and consider a less commonly-reached-for display serif than Italiana (something with more idiosyncratic character — Fraunces is a good candidate: still editorial and restrained, but less interchangeable with "any luxury AI mockup").
- **Font sizes are aggressively small in several places** — `.hero-proof` (9px), `.trust-row span` (9px), badges (8px), note-pyramid labels (7px). This isn't just an accessibility note; at these sizes on an actual phone screen, several of your trust/proof points risk being functionally unreadable rather than quietly elegant. Worth bumping the floor to ~10-11px sitewide.
- Everything else — the three-tier returns layout, the discovery-set feature block, the gift section's restrained composition — reads intentional and on-brand. Keep it.

## 6. Mobile critique by breakpoint (static analysis — no real browser was available to screenshot; verify visually before shipping)

The CSS defines breakpoints at 1000px, 760px, and 430px. You asked me to check 320, 375, 430, 768, 1024, and 1440px specifically — two of those don't line up cleanly with what's defined:

- **768px falls in a gap.** Your mobile nav collapse triggers at `max-width:760px`. At exactly 768px (the most common tablet-portrait width in real traffic), `.nav-icon` stays `display:none` and the full desktop nav (logo + 3 links + a button + bag) renders inline in a 3-column grid header. Worth testing directly — at 768px this is likely to feel cramped compared to either a clean mobile hamburger or a properly-spaced desktop nav.
- **320-375px: the hero headline has no overflow safety net.** The 760px breakpoint sets `.hero-copy h1` to a fixed `62px` (not fluid), with `22px` of horizontal hero padding — leaving roughly 276px of width at a 320px viewport for an "Italiana" display serif at 62px. There's no `overflow-wrap` or `word-break` declared anywhere in the stylesheet. This is a real risk of awkward mid-word wrapping or overflow on the smallest supported width and is worth a direct visual check.
- **1024 and 1440px** fall outside every defined breakpoint (i.e., full desktop styles), which is fine — the 3-column product grid and 4-column trust row have enough padding budget (`6vw` sides) to hold up comfortably at both widths based on the CSS as written.
- **430px** is explicitly handled and looks reasonably considered (buttons stack, trust row goes single-column, size selector goes single-column).

## 7. Accessibility findings

- **No focus trap, no Escape-to-close, and no focus restoration on any of the five modals** (product detail, quiz, cart, checkout handoff, mobile menu). Concretely: opening a modal never moves focus into it (a screen-reader or keyboard user's focus stays on the trigger button while the dialog renders elsewhere in the DOM); nothing listens for `Escape`; closing a modal never returns focus to whatever opened it. `aria-modal="true"` is set on all of them, which actually makes this worse in some assistive tech, since it asserts modality the implementation doesn't back up. This is the single biggest accessibility gap in the codebase and affects every purchase path.
- **Measured contrast failures** on your most-used secondary text color: `--muted: #746d66` on the paper background (`#f5f0e8`) computes to **4.49:1** — just under the 4.5:1 WCAG AA threshold for normal text. On the cream section background (`#f0e8dd`) it's worse, at **4.20:1**. This color is used for nearly every product summary, description, and meta line sitewide, so it's a real, sitewide fix rather than an edge case. A verified replacement that clears AA comfortably on both backgrounds: `#5f584f` (6.18:1 on paper, 5.77:1 on cream) — close enough in tone to preserve the palette.
- **Toggle-style controls don't expose their state to assistive tech.** The family filter tabs and the size-selector buttons use only a CSS `.active`/`.selected` class — no `aria-pressed` or `aria-checked` — so a screen-reader user has no non-visual way to tell which family or size is currently selected.
- **Positive:** the search input correctly pairs a visually-hidden label with the input via wrapping `<label>`, and `prefers-reduced-motion` is respected globally via a blanket animation/transition override — both good defaults that are easy to skip and weren't.

## 8. React code-quality findings

- Component and state design is reasonable for a prototype of this size — a single `App.jsx` is a fine short-term choice, but see §17 for why it becomes a real constraint once real routes matter.
- The `crossSell` `useMemo` has a dead branch: the "cart has a bottle but no discovery set" case and the true default case return the exact same object (`{type:'discovery', product:discoverySet}` twice). Either this was meant to differentiate copy for those two states and didn't, or it's just redundant — worth collapsing into one `else` for clarity.
- Cart item keys mix raw content into the key string directly (e.g. `discovery-personal-discovery-set-3 × 2 ml each`) rather than a stable identifier — this is exactly what produced Bug A. Prefer deriving keys from IDs, never from display strings.
- No TypeScript, no tests, no router — all expected and appropriate for a prototype at this stage, not flagged as defects.

## 9. Shopify integration gaps

Everything here is *already disclosed* in your own `CHANGELOG.md` as intentionally deferred, so this section is a confirmation, not a new finding: there's no real Storefront API call anywhere in the code, "Continue as guest" opens a static local modal rather than creating a Shopify cart, no variant IDs are constructed or passed anywhere, and discovery-credit issuance is copy text with no automation behind it. The `SHOPIFY_IMPLEMENTATION.md` plan (metafields, cart-line attributes for gift message and discovery-set selections, Klaviyo-driven credit code issuance) is a sound MVP approach and matches how Shopify's cart line-item attributes are actually meant to be used for exactly this kind of "extra context that isn't a real product" case.

## 10. Perfume shipping/returns claim risks requiring verification

The current copy ("ground shipping within the contiguous U.S.," explicit pre-launch carrier-approval disclaimers) is appropriately cautious and consistent with how alcohol-based fragrance is actually regulated — it's classified as a Class 3 flammable liquid, USPS restricts it to ground-only domestic shipping with a 16 fl oz per-package cap and no air or international mail, and UPS/FedEx both require enrollment in a contractual hazmat program rather than accepting it as standard freight. One thing to add to your pre-launch checklist that isn't in `SHOPIFY_IMPLEMENTATION.md` yet: the 16 fl oz USPS cap is almost certainly a **per-package**, not per-item, limit — worth explicitly confirming whether an order combining, say, a 100 ml bottle (3.4 fl oz) with a discovery set and a second bottle could approach that ceiling in one box, since that affects packing rules, not just carrier selection.

## 11. Performance findings

- **Bundle size is not currently a concern**: 66.9 KB gzipped JS total for React 19 + the entire app is well within typical budgets — most of that is React itself, not app code. This will grow once Next.js, a router, analytics, and the Shopify SDK are added in production; worth re-measuring at that point rather than worrying about it now.
- **Google Fonts are loaded via `@import` inside `styles.css`**, which is a render-blocking anti-pattern: the browser must fetch and parse the CSS file before it even discovers the font request, rather than being able to start that fetch in parallel. `display=swap` is correctly set (good — avoids invisible text), but the loading mechanism itself should move to `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html`'s `<head>` for a faster first paint once this becomes a real site people are waiting on.

## 12. Recommendation and quiz logic weaknesses

Beyond the concrete bugs above, there's a pattern worth naming: **catalog declaration order leaks into places where rank order should govern.** This shows up twice independently — the cross-sell picking the first *declared* match instead of the first *ranked* match (Bug B), and `Array.prototype.sort`'s stability meaning that any two products tied on quiz score fall back to their order in `perfumes.js` rather than any deliberate tiebreaker. Neither is disastrous alone, but together they mean the "intelligent matching" the product is built around is quietly influenced by an implementation detail (array order) that has nothing to do with the customer's actual answers. Worth a deliberate tiebreaker (e.g., rating, or review count) rather than leaving it to insertion order.

## 13. Exact MVP scope

- Sample-first hero, quiz (with the mood-option and cross-sell fixes from §16), discovery-set cart flow
- Full bottle browsing, search/filter, PDP with real sizes
- Gift branch, working gift-wrap/message (§16)
- Guest-checkout handoff to Shopify Checkout (real, not the current placeholder)
- Static trust row, tiered returns copy, ground-shipping disclaimer
- Accessible modals (focus trap, Escape, restore-focus) — this belongs in MVP, not a later pass, since it touches every purchase path

## 14. Features to defer

- Real-time 3D, particles, cursor effects — already correctly excluded, keep excluding
- Persistent cart/accounts (fine as session-only until real auth is built)
- Subscriptions/replenishment
- CMS-driven editorial content beyond the current hardcoded copy
- International shipping (explicitly gated on carrier/legal approval per your own launch-blockers list)

## 15. Prioritized action plan

**P0 (fix before this is a build reference):**
- Bug A (discovery-set key collision)
- Bug B (cross-sell rank order)
- Modal accessibility (focus trap, Escape, restore-focus) — one reusable hook, applied five times
- Contrast fix on `--muted`

**P1 (fix soon, not blocking):**
- Wire up gift-wrap price + message capture (Bug C)
- Quiz mood-option/product-data mismatch (Bug D)
- 768px nav gap
- Toggle-control `aria-pressed`/`aria-checked`

**P2 (useful, not urgent):**
- Font-loading strategy (`@import` → `<link preconnect>`)
- Minimum font-size floor pass
- Dead branch in `crossSell`
- "Retake quiz" preserving gift/self context
- Palette/typeface distinctiveness pass (§5)

## 16. Concrete code changes for the five highest-impact issues

**1. Fix Bug A — key discovery sets by their actual matches, not a constant string:**
```jsx
const addDiscoverySet = (matches = quizMatches) => addItem({
  type: 'discovery',
  id: discoverySet.id,
  name: discoverySet.name,
  tone: 'cream',
  size: `${discoverySet.sampleCount} × ${discoverySet.sampleSize}`,
  price: discoverySet.price,
  matches: matches.map((product) => product.name),
  key: `discovery-${matches.map((product) => product.id).sort().join('-')}`
});
```

**2. Fix Bug B — cross-sell should read the top-ranked match, not catalog order:**
```jsx
const crossSell = useMemo(() => {
  const discovery = cart.find((item) => item.type === 'discovery');
  if (discovery?.matches?.length) {
    const product = perfumes.find((p) => p.name === discovery.matches[0]) || perfumes[1];
    return { type: 'bottle', product };
  }
  return { type: 'discovery', product: discoverySet };
}, [cart]);
```

**3. Fix Bug C — wire gift wrap and message to real state:**
```jsx
// add alongside other useState calls
const [giftWrap, setGiftWrap] = useState(false);
const [giftMessage, setGiftMessage] = useState('');
const GIFT_WRAP_PRICE = 8;

// update subtotal
const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  + (giftWrap ? GIFT_WRAP_PRICE : 0);
```
```jsx
<div className="cart-options">
  <label>
    <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} />
    Add premium gift wrap — {money(GIFT_WRAP_PRICE)}
  </label>
  <label htmlFor="gift-message">Gift message</label>
  <textarea id="gift-message" value={giftMessage}
    onChange={(e) => setGiftMessage(e.target.value)}
    placeholder="Optional message for the recipient" />
</div>
```

**4. Fix the modal accessibility gap — one reusable hook, applied to all five overlays:**
```jsx
function useDialogA11y(isOpen, onClose) {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement;
    const focusable = containerRef.current?.querySelectorAll(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && focusable?.length) {
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose]);
  return containerRef;
}

// usage, e.g. for the quiz modal:
const quizDialogRef = useDialogA11y(quizOpen, closeQuiz);
// ...
{quizOpen && <div className="overlay quiz-layer" role="dialog" aria-modal="true" aria-label="Scent finder" ref={quizDialogRef}>
```
Apply the same pattern to `activeProduct`, `cartOpen`, `checkoutOpen`, and `menuOpen`.

**5. Fix the contrast failure:**
```css
:root{
  /* was #746d66 — 4.49:1 on paper, 4.20:1 on cream, both fail AA for normal text */
  --muted:#5f584f; /* 6.18:1 on paper, 5.77:1 on cream — verified AA pass */
}
```

## 17. Revised information architecture

The current app is a single route with everything — product detail, quiz, cart, checkout handoff — living in modals. That's fine for a prototype, but it has a structural cost worth planning around now: **nothing is deep-linkable.** You can't share a link to a specific fragrance, the quiz isn't bookmarkable, browser back doesn't close a modal, and product content only exists inside a JS-triggered overlay rather than as its own crawlable page — a real SEO cost for exactly the kind of long-tail, note-based search traffic fragrance sites depend on.

For the Next.js migration, restructure around real routes:
```
/                     — hero, trust row, discovery story, reviews, gift teaser, footer
/shop                 — full grid + filters (replaces the in-page collection section)
/shop/[family]        — indexable family landing pages
/product/[slug]       — real PDP (replaces the product-detail modal)
/scent-finder          — the quiz as its own route, so results are shareable and funnel steps are trackable
/gifts                — dedicated gift landing page
/cart                 — keep the drawer for speed, but give it a real page fallback too
/policies/shipping-returns
```
Modals remain appropriate for the cart drawer and size-selection micro-interactions; product detail and the quiz benefit from being real pages both for SEO and for the accessibility issues in §7 (a real page gets free focus/back-button/URL behavior that a modal has to reimplement by hand).

## 18. Launch-readiness score: 74/100

Broken down, since a single number hides more than it tells you:

| Dimension | Assessment |
|---|---|
| Business logic & concept fidelity | Strong — every prior strategic note was genuinely implemented, not just acknowledged |
| Code correctness | Moderate — two confirmed bugs directly undercut the personalization thesis |
| Accessibility | Needs real work — the modal-focus gap affects every purchase path |
| Visual distinctiveness | Good foundation, one real risk (palette/typeface reads close to a generic pattern) |
| Performance | Good at current scope |
| Production-integration honesty | Excellent — nothing here overclaims what's real vs. deferred |

This is a genuinely good foundation to build the real Next.js/Shopify version from. Fix the P0 list first — none of it is large — and it's a clean handoff.