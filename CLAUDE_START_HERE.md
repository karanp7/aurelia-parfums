# Claude implementation assignment — Aurelia prototype live today

You are taking over an existing React/Vite perfume-commerce prototype. Your immediate goal is **not** Shopify production. Your goal is to make a stable, polished public prototype that can be deployed today and tested by real users with **actual perfume names, images and prices supplied through Excel**.

Work directly in this repository. Do not respond with only advice. Inspect the files, edit the repository, run commands, and leave it in a deployable state.

## Required outcome

By the end of this task:

1. `npm install` succeeds on a normal public npm registry.
2. `npm run dev` opens a working site with no blank page and no browser-console errors.
3. `npm run build` succeeds.
4. Products are generated from `data/products.xlsx`.
5. Actual product images render from either:
   - `public/images/products/<filename>` using Excel's **Image File** column, or
   - a public HTTPS URL using Excel's **Image URL** column.
6. If an image is missing or fails, the existing CSS bottle gracefully appears instead of a broken image.
7. The site is deployable to Vercel today.
8. The P0 and P1 issues in `CLAUDE_AUDIT_FEEDBACK.md` are fixed or explicitly documented if genuinely blocked.

## Important scope boundary

This is a user-testing prototype. Do not add Shopify, real payments, customer accounts, a production backend, or an LLM recommendation service in this pass.

The checkout action may remain a clearly labeled prototype handoff, but every interaction before checkout should behave credibly.

## Product data workflow

The repository contains:

- `data/products.xlsx` — editable spreadsheet used by the prototype
- `data/products-template.xlsx` — clean backup/template
- `scripts/import-products.mjs` — converts Excel rows into `src/data/perfumes.js`
- `public/images/products/` — local product-image directory

The importer is expected to:

- read the `Products` sheet, falling back to the first sheet;
- exclude rows where `Active` is `No`;
- create variants from the 30 ml, 50 ml and 100 ml price columns;
- split notes, occasions and seasons on `|`;
- generate a stable slug if ID is missing;
- use Image URL before Image File;
- fail with a clear row-specific error when a product has no valid price;
- output valid JavaScript into `src/data/perfumes.js`.

Review and improve this importer where necessary. It must tolerate typical Excel input such as prices containing `$` or commas and blank optional cells.

### Embedded Excel images

JavaScript XLSX parsing generally does not extract pictures embedded inside worksheet cells. If the user's real workbook contains embedded pictures rather than filenames/URLs:

1. Inspect the workbook and determine whether the embedded images can be extracted reliably.
2. If you can extract them, place them in `public/images/products/` and populate the corresponding Image File values.
3. If extraction is unreliable, keep the product data import working and state exactly that the images must be exported from Excel as PNG/JPG files. Do not pretend embedded-image import works.

## Fixes required from the previous audit

Read `CLAUDE_AUDIT_FEEDBACK.md` in full. At minimum implement these:

### P0

1. Unique discovery-set keys based on matched product IDs, so two different sets never merge incorrectly.
2. Cross-sell uses the first ranked quiz result, not catalog declaration order.
3. Accessible modal behavior for every overlay:
   - move focus into the dialog;
   - trap Tab/Shift+Tab;
   - close with Escape;
   - return focus to the element that opened it.
4. Change muted text to a WCAG-AA-compliant value, using the audit's verified recommendation unless a better tested value is chosen.

### P1

5. Make gift wrap real local state, add its cost to subtotal, and retain the gift message.
6. Ensure quiz answer options cover catalog moods such as Magnetic and Romantic, or redesign mood scoring so every active product can achieve an equivalent maximum score.
7. Fix the tablet navigation breakpoint around 768 px.
8. Add `aria-pressed` or the appropriate accessible state to family filters and size selectors.
9. Protect the hero headline at 320–375 px.
10. Move Google Font loading from CSS `@import` into optimized `<link>` tags in `index.html`.
11. Raise extremely small interface text to a readable minimum while preserving the restrained luxury aesthetic.
12. Preserve self/gift context when the user retakes only the preference questions.

## Real-image implementation requirements

Actual image support has been partially introduced through `PerfumeBottle.jsx`. Verify all contexts:

- product grid;
- product detail modal;
- quiz result cards;
- shopping cart;
- any featured-product modules.

Images should:

- use `object-fit: contain`;
- preserve bottle proportions;
- have a subtle premium shadow;
- never stretch;
- have useful alt text;
- lazy-load below the fold;
- not cause severe layout shift;
- fall back to the CSS bottle on load failure.

Do not use remote placeholder-image services.

## Prototype conversion behavior

Keep the sample-first business model:

- quiz → three recommendations → personalized discovery set;
- full bottles remain available;
- discovery-set value is presented as future bottle credit;
- gifting is visible and functional in the prototype;
- guest checkout is explicit;
- shipping language remains ground-only and does not promise international shipping.

Do not add fake scarcity, fake viewers, or fabricated reviews beyond clearly labeled existing mock content.

## Testing required

Run and report:

```bash
npm install
npm run import:products
npm run build
```

Also inspect or test these user flows:

1. Search and family filtering.
2. Open product, change size, add bottle to cart.
3. Complete quiz for self.
4. Complete quiz for gift.
5. Add one personalized discovery set, retake with different answers, add another, and verify separate cart lines.
6. Verify cross-sell is the strongest match.
7. Toggle gift wrap and verify subtotal changes by $8.
8. Type a gift message and ensure it remains while cart is open/closed.
9. Test keyboard focus and Escape on each modal.
10. Test widths of 320, 375, 430, 768, 1024 and 1440 px.
11. Temporarily break one image filename and confirm the CSS bottle fallback appears.
12. Verify the console has no uncaught errors.

Add a small automated test suite if practical, especially for quiz ranking, discovery-set keys and cart subtotal. Do not introduce a huge framework solely for appearance.

## Deployment

Make the repository Vercel-ready:

- Vite framework;
- build command `npm run build`;
- output directory `dist`;
- no secrets required;
- no dependency on a local absolute path;
- no references to `localhost` in production UI.

Update `README.md` with exact instructions for:

1. replacing `data/products.xlsx`;
2. adding images;
3. local preview;
4. publishing to GitHub;
5. importing into Vercel;
6. updating products after deployment.

## Deliverables in your response

After editing the repository, provide:

1. A concise list of files changed.
2. Bugs fixed.
3. Product-import instructions.
4. Commands run and their results.
5. Any limitations, especially around embedded Excel images.
6. Exact Vercel publishing steps.
7. Remaining issues divided into launch-blocking and post-test improvements.

Do not rebuild the project into Next.js in this task. Do not expand scope. Stabilize, improve and deploy the Vite prototype today.
