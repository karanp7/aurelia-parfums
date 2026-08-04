# Aurelia Parfums — Shopify-Powered Storefront

A mobile-first React/Vite storefront for a premium fragrance retailer. Products, variants, cart and checkout are all backed by the **Shopify Storefront API** — this app has no product database of its own.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in real values, see below
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. Without valid Shopify env vars, the app shows a clear "Connect Shopify to go live" screen instead of trying (and failing) to load a broken storefront.

## 1. Connect Shopify

Two environment variables, both required, both prefixed `VITE_` so Vite exposes them to the browser:

| Variable | Value |
|---|---|
| `VITE_SHOPIFY_STORE_DOMAIN` | Your `*.myshopify.com` domain — not a custom domain |
| `VITE_SHOPIFY_STOREFRONT_TOKEN` | The **public** Storefront API access token (Headless channel → Storefront API client, or a custom app's Storefront API token) |

Set both in **Vercel → Project Settings → Environment Variables** for production, and in a local `.env.local` (gitignored, copy from `.env.example`) for development.

Never put an Admin API token here — the Storefront token is specifically designed to be safe in client-side code; an Admin token is not.

## 2. Create two small products in Shopify

The storefront expects two products that don't exist by default. Everything degrades gracefully if they're missing (the discovery-set CTAs disable themselves, gift wrap shows "coming soon"), but creating them lights up the full experience:

- **Discovery Set** — handle `discovery-set`, one variant, priced at whatever your sample-set price should be (this price is read live and shown everywhere the old prototype hardcoded "$18").
- **Gift Wrap** — handle `gift-wrap`, one variant, priced at your gift-wrap fee.

Shopify auto-generates a handle from the title (`Discovery Set` → `discovery-set`), or set it explicitly under the product's "Search engine listing" section. If you use different handles, update `DISCOVERY_SET_HANDLE`/`GIFT_WRAP_HANDLE` at the top of `src/App.jsx`.

## 3. Fragrance data — what's real vs. what's derived

No custom metafields are required to run the site, but the richer your Shopify product data, the better the Scent Finder quiz performs:

- **Family** (Floral/Woody/etc.) → Shopify's `productType` field. The shop's filter tabs and the quiz's "atmosphere" question are both generated dynamically from whatever `productType` values your catalog actually has.
- **Mood/intensity** (for quiz matching) → **product tags**. Tag a product with any of `Elegant`, `Confident`, `Energizing`, `Comforting`, `Magnetic`, `Romantic` (mood) and/or `Soft`, `Balanced`, `Bold` (intensity) to make it eligible to score on that axis. Untagged products can still match on family alone.
- **Bestseller badge** → the `Bestseller` tag if you set one; otherwise the storefront falls back to Shopify's own best-selling sort order (a real signal, not a guess).
- **"New" / "Small batch" / "Exclusive" badges** → matching tags, same mechanism.
- **Rating/reviews** → intentionally **not shown**. The original prototype had fabricated star ratings and review quotes; those were removed rather than carried over, since showing invented numbers for real products would mislead real customers. Wire up a real reviews app (Judge.me, Loox, Shopify's own) and its metafields if you want this back.
- **Notes/intensity-longevity-projection wear guidance** → removed for the same reason (was fabricated). See `SHOPIFY_IMPLEMENTATION.md`'s original metafield plan if you want to reintroduce these as real, merchant-entered metafields later — `src/lib/shopifyProducts.js` is where to wire them back in.

## 4. Run locally

```bash
npm install
npm run dev
```

## 5. Publish through GitHub and Vercel

```bash
git add .
git commit -m "Deploy"
git push
```

In Vercel: Framework = Vite, Build command = `npm run build`, Output directory = `dist`. Make sure both env vars from step 1 are set on the Vercel project (Production **and** Preview environments if you want preview deploys to work).

## Testing

```bash
npm run build   # full production build
npm test        # unit tests for quiz ranking, cart mapping, and Shopify product mapping
```

The test suite doesn't hit a live Shopify store — it covers the pure mapping/scoring logic in `src/lib/*.js` with mock data.

## Legacy Excel pipeline

Earlier prototype iterations pulled product data from `data/products.xlsx` via `scripts/import-products.mjs`, generating `src/data/perfumes.js`. That pipeline is **no longer used** — `npm run dev`/`npm run build` no longer run it — now that Shopify is the source of truth. The script, workbook, and generated file are left in the repo in case you want to reference the old data, but are safe to delete along with the `xlsx` devDependency once you've confirmed the Shopify-backed storefront covers everything you need. The old command is still available as `npm run import:products:legacy` if needed.

## Checkout

"Checkout" in the cart drawer is a real link to the Shopify cart's `checkoutUrl` — it hands off to Shopify's hosted checkout for payment, tax and order creation. There is no custom payment code in this repo.

## Key documents

- `CHANGELOG.md` — history of fixes from earlier prototype passes
- `SHOPIFY_IMPLEMENTATION.md` *(git history only — deleted in an earlier commit, `git show <commit>:SHOPIFY_IMPLEMENTATION.md`)* — the original production-architecture plan this integration follows
- `LIVE_TODAY_GUIDE.md` — day-of-launch steps from an earlier, pre-Shopify pass (partially superseded by this README)
