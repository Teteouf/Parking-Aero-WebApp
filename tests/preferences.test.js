'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPreferences, HISTORY_LIMIT, FAVORITES_LIMIT } = require('../public/js/preferences');

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

test('parking and IATA favorites survive reopening and can be removed independently', () => {
  const storage = memoryStorage();
  const first = createPreferences(storage);
  first.toggleFavorite({ mode: 'parking', query: 'E22' });
  first.toggleFavorite({ mode: 'iata', query: 'CDG' });
  const reopened = createPreferences(storage);
  assert(reopened.hasFavorite({ mode: 'parking', query: 'e 22' }));
  assert(reopened.hasFavorite({ mode: 'iata', query: 'c d g' }));
  reopened.removeFavorite({ mode: 'parking', query: 'E22' });
  const afterRemoval = createPreferences(storage);
  assert.equal(afterRemoval.getFavorites().length, 1);
  assert(afterRemoval.hasFavorite({ mode: 'iata', query: 'CDG' }));
});

test('recent searches are distinct, ordered by latest use and bounded to ten', () => {
  const preferences = createPreferences(memoryStorage());
  for (let i = 1; i <= 15; i++) preferences.rememberSearch({ mode: 'parking', query: 'E' + i });
  assert.equal(preferences.getHistory().length, HISTORY_LIMIT);
  assert.equal(preferences.getHistory()[0].query, 'E15');
  preferences.rememberSearch({ mode: 'parking', query: ' e 07 ' });
  preferences.rememberSearch({ mode: 'parking', query: 'E7' });
  assert.equal(preferences.getHistory()[0].query, 'e 07');
  assert.equal(preferences.getHistory().filter(item => ['E7', 'E07', 'e 07'].includes(item.query)).length, 1);
  preferences.rememberSearch({ mode: 'iata', query: 'cdg' });
  preferences.rememberSearch({ mode: 'iata', query: 'C D G' });
  assert.equal(preferences.getHistory().filter(item => item.mode === 'iata').length, 1);
});

test('clearing history persists without removing favorites', () => {
  const storage = memoryStorage();
  const preferences = createPreferences(storage);
  preferences.toggleFavorite({ mode: 'parking', query: 'E22' });
  preferences.rememberSearch({ mode: 'iata', query: 'LON' });
  preferences.clearHistory();
  const reopened = createPreferences(storage);
  assert.deepEqual(reopened.getHistory(), []);
  assert.equal(reopened.getFavorites().length, 1);
});

test('unavailable or full device storage keeps the app usable with an explicit session fallback', () => {
  const storage = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Full'); } };
  const preferences = createPreferences(storage);
  const result = preferences.toggleFavorite({ mode: 'parking', query: 'E22' });
  assert.equal(result.saved, false);
  assert(preferences.hasFavorite({ mode: 'parking', query: 'E22' }));
  preferences.rememberSearch({ mode: 'iata', query: 'CDG' });
  assert.equal(preferences.getHistory().length, 1);
  const noStorage = createPreferences();
  assert.equal(noStorage.toggleFavorite({ mode: 'iata', query: 'LON' }).saved, false);
});

test('corrupt or invalid stored entries never prevent startup or grow the lists', () => {
  const storage = memoryStorage();
  storage.setItem('bad', '{broken');
  assert.deepEqual(createPreferences(storage, 'bad').getFavorites(), []);
  storage.setItem('mixed', JSON.stringify({ version: 1, favorites: [null, { mode: 'other', query: 'E22' }, { mode: 'parking', query: '' }, { mode: 'parking', query: 'E22' }, { mode: 'parking', query: 'e 22' }], history: 'invalid' }));
  const preferences = createPreferences(storage, 'mixed');
  assert.equal(preferences.getFavorites().length, 1);
  assert.deepEqual(preferences.getHistory(), []);
  assert.equal(preferences.rememberSearch({ mode: 'parking', query: 'x'.repeat(81) }), false);
  for (let i = 0; i < 100; i++) preferences.toggleFavorite({ mode: 'parking', query: 'E' + i });
  assert.equal(preferences.getFavorites().length, FAVORITES_LIMIT);
});

test('preferences from different deployment scopes stay separate and synchronize when reloaded', () => {
  const storage = memoryStorage();
  const root = createPreferences(storage, 'app:/');
  const secondTab = createPreferences(storage, 'app:/');
  const otherSite = createPreferences(storage, 'app:/other/');
  root.toggleFavorite({ mode: 'iata', query: 'CDG' });
  secondTab.reload();
  assert(secondTab.hasFavorite({ mode: 'iata', query: 'CDG' }));
  assert.deepEqual(otherSite.getFavorites(), []);
});
