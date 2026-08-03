# Aurelia Parfums — Sample-First Commerce Prototype

A mobile-first React/Vite prototype for a premium fragrance retailer, built around the commercial realities of selling scent online. Product data (names, prices, fragrance attributes, image references) is imported from an Excel workbook before every dev/build run.

## Quick start

```bash
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

`npm run dev` and `npm run build` both run `scripts/import-products.mjs` first, which reads `data/products.xlsx` and regenerates `src/data/perfumes.js`.

## 1. Add your products

Replace `data/products.xlsx` with your real workbook, or edit the rows directly in its `Products` sheet. `data/products-template.xlsx` is a clean starting point with one example row and every expected column.

Required minimum per row:
- Name
- Brand
- Family
- Summary or Description
- At least one of `30ml Price` / `50ml Price` / `100ml Price` (a number greater than 0)

Use `|` to separate multiple values in a cell, e.g. `Bergamot | Lavender | Amber`.

Set `Active` to `No` to temporarily exclude a row without deleting it.

## 2. Add product images (optional — can be done later)

You don't need images to run or deploy this prototype. Every bottle image falls back automatically to the built-in illustrated CSS bottle (see `src/components/PerfumeBottle.jsx`) when no image is supplied or an image fails to load — in the product grid, product detail modal, quiz results, and cart.

When you're ready to add real photography:

1. Export each product picture as PNG, JPG or WebP.
2. Put the files in `public/images/products/`.
3. Enter the exact filename in Excel's `Image File` column (e.g. `dior-sauvage.png`).

Alternatively, enter a public HTTPS image address in Excel's `Image URL` column — this takes priority over `Image File`.

Images embedded directly inside Excel cells are **not** reliably extracted by the importer. Export them as PNG/JPG files into `public/images/products/` instead.

## 3. Run locally

```bash
npm install
npm run dev
```

## 4. Publish through GitHub and Vercel

```bash
git init
git add .
git commit -m "Launch Aurelia prototype"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

In Vercel:
1. Add New → Project.
2. Import the GitHub repository.
3. Framework: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

No environment variables or secrets are required.

## 5. Update products later

Edit `data/products.xlsx`, add or replace images, commit and push. Vercel automatically rebuilds the site (the importer runs as part of `npm run build`).

## Testing

```bash
npm run import:products   # regenerate src/data/perfumes.js from data/products.xlsx
npm run build              # full production build
npm test                   # automated tests for quiz ranking, discovery-set keys, and cart subtotal
```

## Important boundary

This remains a frontend prototype. It does **not** accept money or create real orders. Production commerce should be connected to Shopify Checkout and Shopify Admin. Do not collect real card details in this frontend.

## Key documents

- `CLAUDE_START_HERE.md` — the implementation assignment this revision completed
- `CLAUDE_AUDIT_FEEDBACK.md` — the audit that produced the P0/P1 fix list
- `CHANGELOG.md` — every fix mapped to its source finding
- `SHOPIFY_IMPLEMENTATION.md` — production implementation plan (not part of this pass)
- `LIVE_TODAY_GUIDE.md` — condensed day-of-launch steps
