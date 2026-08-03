import test from 'node:test';
import assert from 'node:assert/strict';
import { rankMatches, discoverySetKey, crossSellProduct, computeSubtotal, GIFT_WRAP_PRICE } from '../src/lib/cartLogic.js';

const perfumes = [
  { id: 'velvet-iris', name: 'Velvet Iris', family: 'Floral', mood: 'Elegant', intensity: 3, rating: 4.9, reviews: 326 },
  { id: 'santal-ember', name: 'Santal Ember', family: 'Woody', mood: 'Confident', intensity: 4, rating: 4.8, reviews: 281 },
  { id: 'neroli-coast', name: 'Neroli Coast', family: 'Fresh', mood: 'Energizing', intensity: 2, rating: 4.7, reviews: 198 },
  { id: 'midnight-fig', name: 'Midnight Fig', family: 'Fruity', mood: 'Magnetic', intensity: 4, rating: 4.8, reviews: 144 },
  { id: 'vanille-suede', name: 'Vanille Suède', family: 'Gourmand', mood: 'Comforting', intensity: 3, rating: 4.9, reviews: 411 },
  { id: 'rose-obscura', name: 'Rose Obscura', family: 'Floral', mood: 'Romantic', intensity: 5, rating: 4.7, reviews: 117 },
];

test('rankMatches puts the strongest quiz match first', () => {
  const answers = { 0: 'Myself', 1: 'Woody', 2: 'Confident', 3: 'Bold' };
  const ranked = rankMatches(perfumes, answers, 3);
  assert.equal(ranked[0].id, 'santal-ember', 'Santal Ember matches family+mood+intensity exactly');
});

test('rankMatches can fully match every catalog mood, including Magnetic and Romantic', () => {
  // Regression test for Bug D: previously Magnetic/Midnight Fig and
  // Romantic/Rose Obscura could never reach a full match score because the
  // quiz did not offer those moods as answers.
  const magneticAnswers = { 1: 'Fruity', 2: 'Magnetic', 3: 'Bold' };
  assert.equal(rankMatches(perfumes, magneticAnswers, 1)[0].id, 'midnight-fig');

  const romanticAnswers = { 1: 'Floral', 2: 'Romantic', 3: 'Bold' };
  assert.equal(rankMatches(perfumes, romanticAnswers, 1)[0].id, 'rose-obscura');
});

test('rankMatches breaks ties on rating/review count rather than catalog order', () => {
  // With no family/mood/intensity answered, every product scores 0 and the
  // catalog-order tiebreaker would previously pick Velvet Iris (first
  // declared). The deliberate tiebreaker should pick the highest-rated,
  // most-reviewed product instead.
  const noAnswers = {};
  const ranked = rankMatches(perfumes, noAnswers, 1);
  assert.equal(ranked[0].id, 'vanille-suede', 'highest rating (tied 4.9) with most reviews wins the tiebreak');
});

test('discoverySetKey differs for two different quiz outcomes (Bug A regression)', () => {
  const setA = [perfumes[0], perfumes[1], perfumes[2]];
  const setB = [perfumes[3], perfumes[4], perfumes[5]];
  const keyA = discoverySetKey(setA);
  const keyB = discoverySetKey(setB);
  assert.notEqual(keyA, keyB, 'two different quiz results must not merge into the same cart line');
});

test('discoverySetKey is stable regardless of match order', () => {
  const setA = [perfumes[0], perfumes[1], perfumes[2]];
  const setAReordered = [perfumes[2], perfumes[0], perfumes[1]];
  assert.equal(discoverySetKey(setA), discoverySetKey(setAReordered));
});

test('crossSellProduct picks the top-ranked match, not catalog declaration order (Bug B regression)', () => {
  // Velvet Iris is declared first in the catalog array, but the quiz's
  // strongest match was Midnight Fig — matches[0] must win.
  const discoveryMatches = ['Midnight Fig', 'Vanille Suède', 'Velvet Iris'];
  const result = crossSellProduct(perfumes, discoveryMatches, perfumes[1]);
  assert.equal(result.id, 'midnight-fig');
});

test('crossSellProduct falls back when there is no discovery set in the cart', () => {
  const result = crossSellProduct(perfumes, undefined, perfumes[1]);
  assert.equal(result.id, perfumes[1].id);
});

test('computeSubtotal adds gift wrap price only when selected', () => {
  const cart = [
    { price: 148, quantity: 1 },
    { price: 18, quantity: 2 },
  ];
  const withoutWrap = computeSubtotal(cart, false);
  const withWrap = computeSubtotal(cart, true);
  assert.equal(withoutWrap, 148 + 18 * 2);
  assert.equal(withWrap, withoutWrap + GIFT_WRAP_PRICE);
});

test('computeSubtotal handles an empty cart', () => {
  assert.equal(computeSubtotal([], false), 0);
  assert.equal(computeSubtotal([], true), GIFT_WRAP_PRICE);
});
