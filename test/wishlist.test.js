import test from 'node:test';
import assert from 'node:assert/strict';
import { readWishlist, isWishlisted, toggleWishlistId, writeWishlist } from '../src/lib/wishlist.js';

function memoryStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = value; },
    _store: store
  };
}

test('readWishlist returns an empty array when nothing is stored', () => {
  assert.deepEqual(readWishlist(memoryStorage()), []);
});

test('readWishlist recovers from corrupt storage instead of throwing', () => {
  assert.deepEqual(readWishlist(memoryStorage({ 'aurelia:wishlist': '{not json' })), []);
});

test('toggleWishlistId adds an id that is not present', () => {
  assert.deepEqual(toggleWishlistId('123', []), ['123']);
});

test('toggleWishlistId removes an id that is already present', () => {
  assert.deepEqual(toggleWishlistId('123', ['123', '456']), ['456']);
});

test('isWishlisted reflects the current list', () => {
  assert.equal(isWishlisted('123', ['123', '456']), true);
  assert.equal(isWishlisted('789', ['123', '456']), false);
});

test('writeWishlist then readWishlist round-trips through storage', () => {
  const storage = memoryStorage();
  writeWishlist(['a', 'b'], storage);
  assert.deepEqual(readWishlist(storage), ['a', 'b']);
});
