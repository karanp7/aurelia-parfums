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

test('mapShopifyProduct derives gender from Shopify\'s "Target gender" metaobject reference (single reference, via .reference)', () => {
  assert.equal(mapShopifyProduct(productNode({ targetGender: { reference: { handle: 'male', fields: [] } } })).gender, 'Men', 'matches via the metaobject handle');
  assert.equal(mapShopifyProduct(productNode({ targetGender: { reference: { handle: 'entry-9f2', fields: [{ key: 'name', value: 'Female' }] } } })).gender, 'Women', 'matches via a field value when the handle itself is opaque');
  assert.equal(mapShopifyProduct(productNode({ targetGender: { reference: { handle: 'gender', fields: [{ key: 'base_target_gender', value: 'Unisex' }] } } })).gender, 'Unisex');
});

test('mapShopifyProduct derives gender from a list-type "Target gender" metaobject reference (via .references)', () => {
  assert.equal(mapShopifyProduct(productNode({ targetGender: { references: { nodes: [{ handle: 'male', fields: [] }] } } })).gender, 'Men');
});

test('mapShopifyProduct falls back to a plain (non-metaobject) metafield value', () => {
  assert.equal(mapShopifyProduct(productNode({ targetGender: { value: 'Male' } })).gender, 'Men');
  assert.equal(mapShopifyProduct(productNode({ targetGender: { value: '["Female"]' } })).gender, 'Women');
});

test('mapShopifyProduct falls back to a plain Men/Women/Unisex tag or a "Target Gender : value" tag when the metafield is unset', () => {
  assert.equal(mapShopifyProduct(productNode({ tags: ['Men'] })).gender, 'Men');
  assert.equal(mapShopifyProduct(productNode({ tags: ["Women's"] })).gender, 'Women');
  assert.equal(mapShopifyProduct(productNode({ tags: ['Unisex'] })).gender, 'Unisex');
  assert.equal(mapShopifyProduct(productNode({ tags: ['Target Gender : Male'] })).gender, 'Men');
  assert.equal(mapShopifyProduct(productNode({ tags: ['target gender: female'] })).gender, 'Women');
  assert.equal(mapShopifyProduct(productNode({ tags: ['Target Gender:Unisex'] })).gender, 'Unisex');
  assert.equal(mapShopifyProduct(productNode({ tags: ['random', 'tag'] })).gender, null, 'no matching tag or metafield -> no gender, not a guess');
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

test('mapShopifyProduct only shows a real Shopify compareAtPrice, and only when it is actually a discount', () => {
  const discounted = mapShopifyProduct(productNode({
    variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', title: '30 ml', availableForSale: true, price: { amount: '98.0' }, compareAtPrice: { amount: '148.0' }, selectedOptions: [] }] }
  }));
  assert.equal(discounted.compareAtPrice, 148, 'real Shopify compare-at value is surfaced');
  assert.equal(discounted.sizes[0].compareAtPrice, 148);

  const noDiscount = mapShopifyProduct(productNode({
    variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', title: '30 ml', availableForSale: true, price: { amount: '98.0' }, selectedOptions: [] }] }
  }));
  assert.equal(noDiscount.compareAtPrice, null, 'no compareAtPrice set on the variant -> no fabricated savings');

  const bogusDiscount = mapShopifyProduct(productNode({
    variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', title: '30 ml', availableForSale: true, price: { amount: '98.0' }, compareAtPrice: { amount: '50.0' }, selectedOptions: [] }] }
  }));
  assert.equal(bogusDiscount.compareAtPrice, null, 'compareAtPrice <= price is not a real discount, so it is dropped rather than shown as negative savings');
});

test('mapShopifyProduct exposes vendorRaw separately from the store-name-coalesced house, so Featured Brands can tell the difference', () => {
  const withVendor = mapShopifyProduct(productNode({ vendor: 'Dior' }));
  assert.equal(withVendor.vendorRaw, 'Dior');
  assert.equal(withVendor.house, 'Dior');

  const withoutVendor = mapShopifyProduct(productNode({ vendor: '' }));
  assert.equal(withoutVendor.vendorRaw, null, 'no real vendor set -> null, not the store name');
  assert.equal(withoutVendor.house, 'Aurelia Parfums', 'house still falls back to the store name for display purposes');
});

test('mapShopifyProduct leaves notes/performance/occasions empty when the metafields are unset, rather than guessing', () => {
  const product = mapShopifyProduct(productNode());
  assert.deepEqual(product.notes, { top: [], heart: [], base: [] });
  assert.deepEqual(product.performance, { longevity: null, projection: null, versatility: null });
  assert.deepEqual(product.occasions, []);
});

test('mapShopifyProduct parses fragrance notes from a JSON-array metafield value', () => {
  const product = mapShopifyProduct(productNode({
    topNotes: { value: '["Bergamot","Pink Pepper"]' },
    heartNotes: { value: '["Iris","Violet"]' },
    baseNotes: { value: '["Musk","Cedar"]' }
  }));
  assert.deepEqual(product.notes.top, ['Bergamot', 'Pink Pepper']);
  assert.deepEqual(product.notes.heart, ['Iris', 'Violet']);
  assert.deepEqual(product.notes.base, ['Musk', 'Cedar']);
});

test('mapShopifyProduct also parses notes/occasions from a plain comma-separated metafield value', () => {
  const product = mapShopifyProduct(productNode({
    topNotes: { value: 'Bergamot, Pink Pepper' },
    occasions: { value: 'Office, Date Night' }
  }));
  assert.deepEqual(product.notes.top, ['Bergamot', 'Pink Pepper']);
  assert.deepEqual(product.occasions, ['Office', 'Date Night']);
});

test('mapShopifyProduct parses performance ratings as clamped numbers, and drops non-numeric values', () => {
  const rated = mapShopifyProduct(productNode({
    longevity: { value: '4.5' },
    projection: { value: '3' },
    versatility: { value: '10' }
  }));
  assert.equal(rated.performance.longevity, 4.5);
  assert.equal(rated.performance.projection, 3);
  assert.equal(rated.performance.versatility, 5, 'clamped to the real 0-5 scale rather than showing an out-of-range number');

  const garbage = mapShopifyProduct(productNode({ longevity: { value: 'high' } }));
  assert.equal(garbage.performance.longevity, null, 'non-numeric metafield value -> section stays hidden, not a guessed rating');
});

test('deriveTone is a stable, deterministic decorative assignment (not a factual claim)', () => {
  const a = deriveTone('gid://shopify/Product/1001');
  const b = deriveTone('gid://shopify/Product/1001');
  assert.equal(a, b, 'same id always gets the same tone');
  assert.ok(['rose', 'amber', 'blue', 'plum', 'cream', 'red'].includes(a));
});
