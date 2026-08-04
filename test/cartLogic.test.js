import test from 'node:test';
import assert from 'node:assert/strict';
import { rankMatches, discoverySetKey, crossSellProduct } from '../src/lib/cartLogic.js';

const products = [
  { id: 'velvet-iris', name: 'Velvet Iris', family: 'Floral', mood: 'Elegant', intensityTag: 'Balanced', availableForSale: true },
  { id: 'santal-ember', name: 'Santal Ember', family: 'Woody', mood: 'Confident', intensityTag: 'Bold', availableForSale: true },
  { id: 'neroli-coast', name: 'Neroli Coast', family: 'Fresh', mood: 'Energizing', intensityTag: 'Soft', availableForSale: true },
  { id: 'midnight-fig', name: 'Midnight Fig', family: 'Fruity', mood: 'Magnetic', intensityTag: 'Bold', availableForSale: true },
  { id: 'vanille-suede', name: 'Vanille Suède', family: 'Gourmand', mood: 'Comforting', intensityTag: 'Balanced', availableForSale: true },
  { id: 'rose-obscura', name: 'Rose Obscura', family: 'Floral', mood: 'Romantic', intensityTag: 'Bold', availableForSale: false },
];

test('rankMatches puts the strongest quiz match first', () => {
  const answers = { 0: 'Myself', 1: 'Woody', 2: 'Confident', 3: 'Bold' };
  const ranked = rankMatches(products, answers, 3);
  assert.equal(ranked[0].id, 'santal-ember', 'Santal Ember matches family+mood+intensity exactly');
});

test('rankMatches still fully matches every catalog mood, including Magnetic and Romantic', () => {
  const magneticAnswers = { 1: 'Fruity', 2: 'Magnetic', 3: 'Bold' };
  assert.equal(rankMatches(products, magneticAnswers, 1)[0].id, 'midnight-fig');

  const romanticAnswers = { 1: 'Floral', 2: 'Romantic', 3: 'Bold' };
  assert.equal(rankMatches(products, romanticAnswers, 1)[0].id, 'rose-obscura');
});

test('rankMatches never lets a tie favor a sold-out product over an in-stock one', () => {
  // Both Floral products score identically (family-only match); Rose Obscura
  // is sold out, so Velvet Iris must win the tie even though Rose Obscura
  // would have won on catalog order alone.
  const answers = { 1: 'Floral' };
  const ranked = rankMatches(products, answers, 1);
  assert.equal(ranked[0].id, 'velvet-iris');
});

test('rankMatches falls back to catalog order when scores and availability both tie', () => {
  const ranked = rankMatches(products, {}, 1);
  assert.equal(ranked[0].id, 'velvet-iris', 'first declared, in-stock product wins with no signal at all');
});

test('rankMatches treats an untagged product (no mood/intensity yet) as simply unable to score on that axis, not broken', () => {
  const untagged = { id: 'plain', name: 'Plain Musk', family: 'Woody', mood: null, intensityTag: null, availableForSale: true };
  const ranked = rankMatches([...products, untagged], { 1: 'Woody', 2: 'Confident', 3: 'Bold' }, 2);
  assert.equal(ranked[0].id, 'santal-ember', 'fully-tagged product still outranks the untagged one');
  assert.ok(ranked.map((p) => p.id).includes('plain'), 'untagged product can still be returned, just lower-ranked');
});

test('discoverySetKey differs for two different quiz outcomes (Bug A regression)', () => {
  const keyA = discoverySetKey(['Velvet Iris', 'Santal Ember', 'Neroli Coast']);
  const keyB = discoverySetKey(['Midnight Fig', 'Vanille Suède', 'Rose Obscura']);
  assert.notEqual(keyA, keyB, 'two different quiz results must not merge into the same cart line');
});

test('discoverySetKey is stable regardless of match order', () => {
  const keyA = discoverySetKey(['Velvet Iris', 'Santal Ember', 'Neroli Coast']);
  const keyReordered = discoverySetKey(['Neroli Coast', 'Velvet Iris', 'Santal Ember']);
  assert.equal(keyA, keyReordered);
});

test('crossSellProduct picks the top-ranked match, not catalog declaration order (Bug B regression)', () => {
  const discoveryMatches = ['Midnight Fig', 'Vanille Suède', 'Velvet Iris'];
  const result = crossSellProduct(products, discoveryMatches, products[1]);
  assert.equal(result.id, 'midnight-fig');
});

test('crossSellProduct falls back when there is no discovery set in the cart', () => {
  const result = crossSellProduct(products, undefined, products[1]);
  assert.equal(result.id, products[1].id);
});
