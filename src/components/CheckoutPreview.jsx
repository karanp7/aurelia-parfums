import React from 'react';

export default function CheckoutPreview({ onClose, dialogRef }) {
  return <div className="overlay modal-layer" role="dialog" aria-modal="true" aria-label="Checkout integration preview" ref={dialogRef} tabIndex={-1}>
    <div className="checkout-preview">
      <button className="close" onClick={onClose}>×</button>
      <p className="overline dark">Prototype boundary</p>
      <h2>Connect this button to Shopify Checkout.</h2>
      <p>The visual storefront is ready to hand off cart lines, variants, gift attributes and discovery-credit codes. Production payment, taxes, inventory, fraud checks, shipping restrictions and orders should be handled by Shopify.</p>
      <div className="flow"><span>Storefront cart</span><i>→</i><span>Shopify checkout</span><i>→</i><span>Shopify Admin orders</span></div>
      <ul><li>Guest checkout enabled</li><li>Orders visible in Shopify mobile and desktop admin</li><li>Ground-only shipping profiles for fragrance products</li><li>Packing slips, labels, tracking and customer emails</li></ul>
      <button className="btn btn-dark full" onClick={onClose}>Return to prototype</button>
    </div>
  </div>;
}
