import test from 'node:test';
import assert from 'node:assert/strict';
import { mapShopifyCart, DISCOVERY_LINE_ATTRIBUTE_KEY, DISCOVERY_LINE_ATTRIBUTE_VALUE, MATCHES_ATTRIBUTE_KEY } from '../src/lib/shopifyCart.js';

function rawCart(overrides = {}) {
  return {
    id: 'gid://shopify/Cart/abc',
    checkoutUrl: 'https://aurelia.myshopify.com/cart/c/abc',
    totalQuantity: 2,
    cost: {
      subtotalAmount: { amount: '166.00', currencyCode: 'USD' },
      totalAmount: { amount: '166.00', currencyCode: 'USD' }
    },
    attributes: [],
    lines: { nodes: [] },
    ...overrides
  };
}

test('mapShopifyCart reads subtotal/total from Shopify cost fields, not local math', () => {
  const cart = mapShopifyCart(rawCart());
  assert.equal(cart.subtotal, 166);
  assert.equal(cart.total, 166);
  assert.equal(cart.currencyCode, 'USD');
});

test('mapShopifyCart marks a line as a discovery set only via the hidden _type attribute', () => {
  const cart = mapShopifyCart(rawCart({
    lines: {
      nodes: [{
        id: 'gid://shopify/CartLine/1',
        quantity: 1,
        attributes: [
          { key: DISCOVERY_LINE_ATTRIBUTE_KEY, value: DISCOVERY_LINE_ATTRIBUTE_VALUE },
          { key: MATCHES_ATTRIBUTE_KEY, value: 'Velvet Iris, Santal Ember, Neroli Coast' }
        ],
        cost: { totalAmount: { amount: '18.00' } },
        merchandise: {
          id: 'gid://shopify/ProductVariant/1',
          title: 'Default Title',
          image: null,
          price: { amount: '18.00' },
          product: { title: 'Discovery Set', handle: 'discovery-set' }
        }
      }]
    }
  }));

  assert.equal(cart.lines[0].type, 'discovery');
  assert.deepEqual(cart.lines[0].matches, ['Velvet Iris', 'Santal Ember', 'Neroli Coast']);
  assert.equal(cart.lines[0].size, null, '"Default Title" variant title should not be shown as a size');
});

test('mapShopifyCart treats a line with no discovery attribute as a regular bottle', () => {
  const cart = mapShopifyCart(rawCart({
    lines: {
      nodes: [{
        id: 'gid://shopify/CartLine/2',
        quantity: 1,
        attributes: [],
        cost: { totalAmount: { amount: '148.00' } },
        merchandise: {
          id: 'gid://shopify/ProductVariant/2',
          title: '50 ml',
          image: { url: 'https://cdn.shopify.com/velvet-iris.jpg', altText: 'Velvet Iris' },
          price: { amount: '148.00' },
          product: { title: 'Velvet Iris', handle: 'velvet-iris' }
        }
      }]
    }
  }));

  assert.equal(cart.lines[0].type, 'bottle');
  assert.equal(cart.lines[0].matches, null);
  assert.equal(cart.lines[0].size, '50 ml');
});

test('mapShopifyCart recognizes a gift-wrap line via the same _type attribute mechanism', () => {
  const cart = mapShopifyCart(rawCart({
    lines: {
      nodes: [{
        id: 'gid://shopify/CartLine/3',
        quantity: 1,
        attributes: [{ key: '_type', value: 'gift-wrap' }],
        cost: { totalAmount: { amount: '8.00' } },
        merchandise: {
          id: 'gid://shopify/ProductVariant/3',
          title: 'Default Title',
          image: null,
          price: { amount: '8.00' },
          product: { title: 'Gift Wrap', handle: 'gift-wrap' }
        }
      }]
    }
  }));
  assert.equal(cart.lines[0].type, 'gift-wrap');
});

test('mapShopifyCart returns null for a missing cart instead of throwing', () => {
  assert.equal(mapShopifyCart(null), null);
});
