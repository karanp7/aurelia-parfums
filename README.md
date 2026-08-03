# Aurelia Parfums — Sample-First Commerce Prototype

A mobile-first React/Vite prototype for a premium fragrance retailer. This revision is intentionally built around the commercial realities of selling scent online rather than spectacle alone.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

## What changed in this revision

- Sample-first primary journey: quiz → three-scent discovery set → bottle credit
- Discovery set modeled as a real cart item
- Gift branch in the quiz, gift messaging and gift-wrap affordances
- Static trust commitments instead of a promotional moving marquee
- Descriptive verified-review content beyond star ratings
- Product sizes and prices
- Cart quantities and free-ground-shipping progress
- Guest checkout explicitly stated
- More useful cross-sell logic: discovery set before a second blind bottle
- Ground-shipping scope and dangerous-goods implementation warning
- Three-tier return-policy presentation
- Quieter, editorial motion rather than heavy real-time 3D
- Checkout handoff screen explaining the Shopify production boundary

## Important boundary

This remains a frontend prototype. It does **not** accept money or create real orders. Production commerce should be connected to Shopify Checkout and Shopify Admin. Do not collect real card details in this frontend.

## Review documents

- `CLAUDE_REVIEW.md` — paste-ready audit instructions for Claude
- `SHOPIFY_IMPLEMENTATION.md` — decisive production implementation plan
- `CHANGELOG.md` — changes mapped to the external feedback

---

## Live prototype workflow added

For the current implementation assignment, begin with:

- `CLAUDE_START_HERE.md`
- `LIVE_TODAY_GUIDE.md`
- `data/products.xlsx`

The application now imports product names, prices, fragrance attributes and image references from Excel before development and production builds.
