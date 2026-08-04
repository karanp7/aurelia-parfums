import test from 'node:test';
import assert from 'node:assert/strict';
import { mapShopifyProduct, deriveTone } from '../src/lib/shopifyProducts.js';

function productNode(overrides = {}) {
  return {
    id: 'gid://shopify/Product/1001',
    handle: 'velvet-iris',
    title: 'Velvet Iris',
    description: 'Soft iris and violet with a polished, skin-like musk finish. Stays close to the skin.',
    vendor: 'Maison Aurelia',
    productType: 'Floral',
    tags: ['Bestseller', 'Elegant', 'Soft'],
    availableForSale: true,
    images: { nodes: [{ url: 'https://cdn.shopify.com/velvet-iris.jpg', altText: 'Velvet Iris bottle' }] },
    priceRange: { minVariantPrice: { amount: '98.0', currencyCode: 'USD' } },
    variants: {
      nodes: [
        { id: 'gid://shopify/ProductVariant/1', title: '30 ml', availableForSale: true, price: { amount: '98.0' }, selectedOptions: [{ name: 'Size', value: '30 ml' }] },
        { id: 'gid://shopify/ProductVariant/2', title: '50 ml', availableForSale: false, price: { amount: '148.0' }, selectedOptions: [{ name: 'Size', value: '50 ml' }] }
      ]
    },
    ...overrides
  };
}

test('mapShopifyProduct maps core fields from real Shopify fields, not fabricated ones', () => {
  const product = mapShopifyProduct(productNode());
  assert.equal(product.id, '1001');
  assert.equal(product.handle, 'velvet-iris');
  assert.equal(product.name, 'Velvet Iris');
  assert.equal(product.house, 'Maison Aurelia', 'house comes from the real Shopify vendor field');
  assert.equal(product.family, 'Floral', 'family comes from the real Shopify productType field');
  assert.equal(product.image, 'https://cdn.shopify.com/velvet-iris.jpg');
  assert.equal(product.sizes.length, 2);
  assert.equal(product.sizes[0].variantId, 'gid://shopify/ProductVariant/1');
  assert.equal(product.price, 98, 'price reads from the first real variant, not a fabricated number');
});

test('mapShopifyProduct only sets a badge from a real merchant tag, never invents one', () => {
  assert.equal(mapShopifyProduct(productNode()).badge, 'Bestseller');
  assert.equal(mapShopifyProduct(productNode({ tags: ['Floral', 'Gift'] })).badge, null, 'no matching tag -> no badge, not a guess');
});

test('mapShopifyProduct derives mood/intensity only from a matching tag', () => {
  const withTags = mapShopifyProduct(productNode({ tags: ['Elegant', 'Soft'] }));
  assert.equal(withTags.mood, 'Elegant');
  assert.equal(withTags.intensityTag, 'Soft');

  const withoutTags = mapShopifyProduct(productNode({ tags: ['random', 'tag'] }));
  assert.equal(withoutTags.mood, null, 'no metafields/tags yet -> quiz degrades gracefully instead of guessing');
  assert.equal(withoutTags.intensityTag, null);
});

test('mapShopifyProduct treats availableForSale as sold-out-aware, not just a product flag', () => {
  const soldOutVariants = mapShopifyProduct(productNode({
    availableForSale: true,
    variants: { nodes: [{ id: 'gid://shopify/ProductVariant/9', title: 'Only size', availableForSale: false, price: { amount: '10' }, selectedOptions: [] }] }
  }));
  assert.equal(soldOutVariants.availableForSale, false, 'product-level flag alone is not enough if every variant is sold out');
});

test('mapShopifyProduct truncates the summary from the real description rather than inventing marketing copy', () => {
  const longDescription = 'A '.repeat(100) + 'end.';
  const product = mapShopifyProduct(productNode({ description: longDescription }));
  assert.ok(product.summary.length <= 132);
  assert.ok(longDescription.startsWith(product.summary.replace('…', '').trim()));
});

test('deriveTone is a stable, deterministic decorative assignment (not a factual claim)', () => {
  const a = deriveTone('gid://shopify/Product/1001');
  const b = deriveTone('gid://shopify/Product/1001');
  assert.equal(a, b, 'same id always gets the same tone');
  assert.ok(['rose', 'amber', 'blue', 'plum', 'cream', 'red'].includes(a));
});
