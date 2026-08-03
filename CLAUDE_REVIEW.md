# Claude Code / Claude Analysis Handoff

## Suggested workflow

1. Extract the project.
2. Open the entire folder in Claude Code or upload the ZIP to Claude.
3. Ask Claude to run `npm install` and `npm run build`.
4. Ask it to inspect every source and markdown file before proposing changes.
5. Ask it to distinguish prototype defects from production integrations that are deliberately absent.

## Paste-ready review prompt

You are reviewing a React/Vite perfume ecommerce prototype named Aurelia Parfums. Read the entire repository, including README.md, CHANGELOG.md, SHOPIFY_IMPLEMENTATION.md, src/App.jsx, src/styles.css and src/data/perfumes.js.

The business goal is not merely visual beauty. It is a premium, high-conversion fragrance experience that is operationally simple for a small seller. The revised concept is sample-first: users take a quiz, buy a three-scent discovery set, try fragrances at home, then receive the set value as credit toward a full bottle. Production commerce should use Shopify Checkout and Shopify Admin.

Please perform a critical repository-level audit and return:

1. Build/runtime errors and exact fixes.
2. React state, component-architecture and maintainability issues.
3. Accessibility defects, especially dialogs, focus management, keyboard use, forms and announcements.
4. Mobile-layout and interaction defects at 320, 375, 430, 768 and 1024 px.
5. Performance risks from CSS, fonts, animation and rendering.
6. Conversion problems in the sample-first, product, gift and cart flows.
7. Places where the UI makes claims that should instead be backed by Shopify configuration, legal policy or carrier approval.
8. A concrete refactor plan from Vite prototype to Next.js + TypeScript + Shopify Storefront API.
9. A proposed Shopify product/metafield model and cart-line attributes for personalized discovery sets and gifts.
10. A test plan covering unit, component, accessibility, end-to-end and checkout-handoff behavior.
11. A prioritized list split into: launch blocker, high impact, useful later.
12. Code patches for the five highest-impact frontend improvements.

Constraints:

- Do not recommend a custom payment/order backend unless there is a demonstrated requirement Shopify cannot satisfy.
- Do not add heavy 3D, particles or decorative animation just to look advanced.
- Preserve the quiet editorial visual direction.
- Do not present generalized perfume shipping limits as legal certainty. Treat carrier classification, packaging and allowed services as launch blockers requiring actual product data and carrier approval.
- Do not claim the prototype currently accepts payments or creates orders.
- Keep guest checkout, gifting, descriptive reviews, discovery credit and free-shipping progress as core requirements.

After the audit, propose a branch-by-branch implementation sequence suitable for Claude Code to execute safely.

## Key files

- `src/App.jsx`: all prototype behavior and current UI composition
- `src/styles.css`: responsive visual system and animation
- `src/data/perfumes.js`: structured mock perfume content
- `SHOPIFY_IMPLEMENTATION.md`: intended production architecture
- `CHANGELOG.md`: mapping from external feedback to implementation

## Known prototype limitations

- No router, TypeScript or server rendering
- No focus trap or focus restoration in dialogs
- No real Shopify connection
- Gift-wrap checkbox does not change totals
- Cart and quiz state do not persist
- Discovery credit is copy only, not issued
- Product imagery is CSS placeholder art
- Reviews are mock content
- Shipping and return wording requires final operational/legal approval
