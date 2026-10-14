(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core'));
  else root.ParkingPreferences = factory(root.ParkingCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';
  const HISTORY_LIMIT = 10;
  const FAVORITES_LIMIT = 50;

  function entry(value) {
    if (!value || !['parking', 'iata'].includes(value.mode) || typeof value.query !== 'string') return null;
    const query = value.query.trim().replace(/\s+/g, ' ');
    return query && query.length <= 80 ? { mode: value.mode, query } : null;
  }

  function identity(value) {
    const item = entry(value);
    if (!item) return '';
    const compact = core.normalize(item.query).replace(/[\s.-]/g, '');
    const query = item.mode === 'parking' ? core.pointCode(item.query) : /^[A-Z]{3}$/.test(compact) ? compact : core.normalize(item.query);
    return item.mode + ':' + query;
  }

  function cleanList(value, limit) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.map(entry).filter(item => {
      if (!item || seen.has(identity(item))) return false;
      seen.add(identity(item));
      return true;
    }).slice(0, limit);
  }

  function createPreferences(storage, key = 'cdg-parking.preferences.v1') {
    let favorites = [];
    let history = [];
    let saved = Boolean(storage);

    function reload() {
      try {
        const data = JSON.parse(storage ? storage.getItem(key) : 'null');
        favorites = cleanList(data && data.version === 1 && data.favorites, FAVORITES_LIMIT);
        history = cleanList(data && data.version === 1 && data.history, HISTORY_LIMIT);
      } catch (error) { favorites = []; history = []; if (error.name !== 'SyntaxError') saved = false; }
    }

    function persist() {
      try {
        if (!storage) throw new Error('Storage unavailable');
        storage.setItem(key, JSON.stringify({ version: 1, favorites, history }));
        saved = true;
      } catch (_) { saved = false; }
      return saved;
    }

    function hasFavorite(value) { return favorites.some(item => identity(item) === identity(value)); }

    function toggleFavorite(value) {
      const item = entry(value);
      if (!item) return { changed: false, saved, favorite: false };
      const existing = hasFavorite(item);
      if (!existing && favorites.length >= FAVORITES_LIMIT) return { changed: false, saved, favorite: false, limit: true };
      favorites = favorites.filter(favorite => identity(favorite) !== identity(item));
      if (!existing) favorites.unshift(item);
      return { changed: true, saved: persist(), favorite: !existing };
    }

    function removeFavorite(value) {
      const before = favorites.length;
      favorites = favorites.filter(item => identity(item) !== identity(value));
      return before !== favorites.length ? persist() : saved;
    }

    function rememberSearch(value) {
      const item = entry(value);
      if (!item || (history[0] && identity(history[0]) === identity(item))) return false;
      history = [item, ...history.filter(previous => identity(previous) !== identity(item))].slice(0, HISTORY_LIMIT);
      persist();
      return true;
    }

    reload();
    return { key, hasFavorite, toggleFavorite, removeFavorite, rememberSearch, reload,
      getFavorites: () => favorites.map(item => ({ ...item })),
      getHistory: () => history.map(item => ({ ...item })),
      clearHistory() { history = []; return persist(); },
      isSaved: () => saved };
  }

  return { createPreferences, HISTORY_LIMIT, FAVORITES_LIMIT };
});
