# Feedback-to-Implementation Changelog

## Implemented in the prototype

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
   - “Gift” branch in the quiz.
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

## Still intentionally not implemented

- Real Shopify Storefront API integration
- Shopify cart IDs and checkout URLs
- Real inventory, payments, taxes or orders
- Carrier-approved shipping rates or labels
- Gift-wrap price calculation in cart
- Bottle-credit code issuance/redemption
- Persistent cart and accounts
- Real product photography and CMS content
- Verified-review backend
- Legal review of policies
