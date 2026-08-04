import { shopifyFetch } from './shopify.js';

export const CART_ID_STORAGE_KEY = 'aurelia:shopify-cart-id';

// Any line attribute key starting with "_" is hidden from the customer-facing
// cart/checkout UI but still visible in Shopify Admin — used here to carry
// the local "is this a discovery set" marker without confusing the shopper
// at checkout. The (non-hidden) "Matches" attribute intentionally *does*
// show at checkout, so the customer sees their three matched fragrances and
// fulfillment can read them off the order, per SHOPIFY_IMPLEMENTATION.md.
export const LINE_TYPE_ATTRIBUTE_KEY = '_type';
export const DISCOVERY_LINE_ATTRIBUTE_KEY = LINE_TYPE_ATTRIBUTE_KEY; // back-compat alias
export const DISCOVERY_LINE_ATTRIBUTE_VALUE = 'discovery-set';
export const GIFT_WRAP_LINE_ATTRIBUTE_VALUE = 'gift-wrap';
export const MATCHES_ATTRIBUTE_KEY = 'Matches';

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  attributes { key value }
  lines(first: 50) {
    nodes {
      id
      quantity
      attributes { key value }
      cost { totalAmount { amount currencyCode } }
      merchandise {
        ... on ProductVariant {
          id
          title
          image { url altText }
          price { amount currencyCode }
          product { title handle }
        }
      }
    }
  }
`;

const CART_QUERY = `query CartById($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`;

const CART_CREATE_MUTATION = `
  mutation CartCreate($input: CartInput) {
    cartCreate(input: $input) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_ATTRIBUTES_UPDATE_MUTATION = `
  mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

function assertNoUserErrors(userErrors, action) {
  if (userErrors?.length) {
    throw new Error(`Shopify cart ${action} failed: ${userErrors.map((error) => error.message).join('; ')}`);
  }
}

/** Maps a raw Storefront API cart into the shape the cart drawer renders. */
export function mapShopifyCart(cart) {
  if (!cart) return null;
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    totalQuantity: cart.totalQuantity,
    subtotal: Number(cart.cost?.subtotalAmount?.amount ?? 0),
    total: Number(cart.cost?.totalAmount?.amount ?? 0),
    currencyCode: cart.cost?.subtotalAmount?.currencyCode || 'USD',
    attributes: cart.attributes || [],
    lines: (cart.lines?.nodes || []).map((line) => {
      const attributes = line.attributes || [];
      const typeValue = attributes.find((attribute) => attribute.key === LINE_TYPE_ATTRIBUTE_KEY)?.value;
      const type = typeValue === DISCOVERY_LINE_ATTRIBUTE_VALUE
        ? 'discovery'
        : typeValue === GIFT_WRAP_LINE_ATTRIBUTE_VALUE
          ? 'gift-wrap'
          : 'bottle';
      const matches = attributes.find((attribute) => attribute.key === MATCHES_ATTRIBUTE_KEY)?.value;
      return {
        lineId: line.id,
        quantity: line.quantity,
        type,
        matches: matches ? matches.split(', ') : null,
        name: line.merchandise?.product?.title || line.merchandise?.title,
        handle: line.merchandise?.product?.handle,
        size: line.merchandise?.title === 'Default Title' ? null : line.merchandise?.title,
        image: line.merchandise?.image?.url || '',
        imageAlt: line.merchandise?.image?.altText || line.merchandise?.product?.title,
        unitPrice: Number(line.merchandise?.price?.amount ?? 0),
        lineTotal: Number(line.cost?.totalAmount?.amount ?? 0)
      };
    })
  };
}

export async function getOrCreateCart() {
  const storedId = localStorage.getItem(CART_ID_STORAGE_KEY);
  if (storedId) {
    try {
      const data = await shopifyFetch(CART_QUERY, { id: storedId });
      if (data.cart) return mapShopifyCart(data.cart);
    } catch {
      // stored cart id is stale/invalid — fall through and create a new one
    }
  }
  const data = await shopifyFetch(CART_CREATE_MUTATION, { input: {} });
  assertNoUserErrors(data.cartCreate.userErrors, 'create');
  const cart = data.cartCreate.cart;
  localStorage.setItem(CART_ID_STORAGE_KEY, cart.id);
  return mapShopifyCart(cart);
}

export async function addCartLine(cartId, { merchandiseId, quantity = 1, attributes = [] }) {
  const data = await shopifyFetch(CART_LINES_ADD_MUTATION, {
    cartId,
    lines: [{ merchandiseId, quantity, attributes }]
  });
  assertNoUserErrors(data.cartLinesAdd.userErrors, 'add');
  return mapShopifyCart(data.cartLinesAdd.cart);
}

export async function updateCartLineQuantity(cartId, lineId, quantity) {
  const data = await shopifyFetch(CART_LINES_UPDATE_MUTATION, {
    cartId,
    lines: [{ id: lineId, quantity }]
  });
  assertNoUserErrors(data.cartLinesUpdate.userErrors, 'update');
  return mapShopifyCart(data.cartLinesUpdate.cart);
}

export async function removeCartLine(cartId, lineId) {
  const data = await shopifyFetch(CART_LINES_REMOVE_MUTATION, { cartId, lineIds: [lineId] });
  assertNoUserErrors(data.cartLinesRemove.userErrors, 'remove');
  return mapShopifyCart(data.cartLinesRemove.cart);
}

export async function setCartAttributes(cartId, attributes) {
  const data = await shopifyFetch(CART_ATTRIBUTES_UPDATE_MUTATION, { cartId, attributes });
  assertNoUserErrors(data.cartAttributesUpdate.userErrors, 'attributes update');
  return mapShopifyCart(data.cartAttributesUpdate.cart);
}
