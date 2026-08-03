# Production Implementation: Custom Storefront + Shopify

## Decision

Use the custom premium storefront for discovery and storytelling, but use Shopify for products, variants, inventory, discounts, checkout, payments, tax, orders, refunds and seller operations.

## Recommended production stack

- Next.js + TypeScript
- Shopify Storefront API
- Shopify hosted checkout
- Shopify Admin and Shopify mobile admin app
- Shopify Payments
- Shopify Search & Discovery
- Shopify metaobjects/metafields for fragrance data
- Klaviyo for quiz, sample-credit and lifecycle email
- Vercel
- PostHog or GA4
- Sentry
- ShipStation/Shippo/approved carrier workflow only after dangerous-goods review

## Shopify catalog structure

### Product types

- Full-size fragrance
- Travel fragrance
- Individual sample
- Discovery set
- Gift card
- Gift wrap

### Full-bottle variants

- 30 ml
- 50 ml
- 100 ml

### Key metafields

- Primary and secondary family
- Top, heart and base notes
- Intensity, longevity and projection
- Sweetness, freshness, warmth, woodiness and smokiness
- Seasons and occasions
- Plain-language smell description
- Shipping eligibility / dangerous-goods profile
- Discovery-credit eligibility

## Discovery-set implementation

MVP approach:

1. Create one discovery-set product with a fixed price.
2. Add selected sample product/variant IDs as cart line attributes.
3. Fulfillment staff see the three selections in Shopify order details and packing slips.
4. When fulfilled, Klaviyo sends a unique $18 discount code valid for 45 days.
5. Restrict code to eligible full-size products, one use per customer/order.

Later, use Shopify Functions or an app if discount restrictions become more complex.

## Checkout handoff

The React/Next storefront should create/update a Shopify cart with:

- Variant IDs
- Quantity
- Gift-wrap line
- Gift message as cart/line attribute
- Discovery-set selections as line attributes
- Quiz profile ID for analytics

Then redirect to Shopify's `checkoutUrl`.

## Seller workflow

1. New paid order appears in Shopify Admin/mobile app.
2. Staff sees bottle sizes, discovery samples and gift message.
3. Shipping profile only exposes approved ground services.
4. Staff prints packing slip and approved label.
5. Tracking syncs to Shopify.
6. Shopify sends shipment confirmation.
7. Discovery-set automation sends bottle credit.

## Launch blockers outside code

- Obtain SDS/product transport information from suppliers.
- Confirm classification, quantity limits, packaging, markings and accepted services with the chosen carrier/account.
- Test packaging for leakage and breakage.
- Configure Shopify shipping profiles to prevent disallowed methods and destinations.
- Have return, privacy, terms and shipping policies reviewed for the actual selling jurisdictions.
- Do not launch international shipping until a compliant process is separately approved.
