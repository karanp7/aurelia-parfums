import test from 'node:test';
import assert from 'node:assert/strict';
import { readRecentlyViewed, recordView, writeRecentlyViewed, RECENTLY_VIEWED_LIMIT } from '../src/lib/recentlyViewed.js';

function memoryStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = value; },
    _store: store
  };
}

test('readRecentlyViewed returns an empty array when nothing is stored', () => {
  assert.deepEqual(readRecentlyViewed(memoryStorage()), []);
});

test('readRecentlyViewed recovers from corrupt storage instead of throwing', () => {
  assert.deepEqual(readRecentlyViewed(memoryStorage({ 'aurelia:recently-viewed': '{not json' })), []);
});

test('recordView adds a new id to the front', () => {
  assert.deepEqual(recordView('123', []), ['123']);
  assert.deepEqual(recordView('123', ['456']), ['123', '456']);
});

test('recordView moves an already-viewed id back to the front instead of duplicating it', () => {
  assert.deepEqual(recordView('456', ['123', '456', '789']), ['456', '123', '789']);
});

test('recordView caps the list at RECENTLY_VIEWED_LIMIT, dropping the oldest', () => {
  const full = Array.from({ length: RECENTLY_VIEWED_LIMIT }, (_, i) => String(i));
  const next = recordView('new', full);
  assert.equal(next.length, RECENTLY_VIEWED_LIMIT);
  assert.equal(next[0], 'new');
  assert.ok(!next.includes(String(RECENTLY_VIEWED_LIMIT - 1)));
});

test('writeRecentlyViewed then readRecentlyViewed round-trips through storage', () => {
  const storage = memoryStorage();
  writeRecentlyViewed(['a', 'b'], storage);
  assert.deepEqual(readRecentlyViewed(storage), ['a', 'b']);
});
