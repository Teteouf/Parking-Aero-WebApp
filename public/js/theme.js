(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else api.initialize(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const valid = value => value === 'light' || value === 'dark' ? value : null;

  function createThemePreference(storage, key, systemDark = false) {
    let preference = null;
    function reload() {
      try { preference = valid(storage && storage.getItem(key)); } catch (_) { /* Keep the session choice if reads fail. */ }
    }
    reload();
    const value = () => preference || (systemDark ? 'dark' : 'light');
    return { key, value, reload,
      systemChanged(dark) { systemDark = Boolean(dark); },
      toggle() {
        preference = value() === 'dark' ? 'light' : 'dark';
        try { if (storage) storage.setItem(key, preference); } catch (_) { /* The switch still works for this session. */ }
        return value();
      }
    };
  }

  function initialize(window) {
    const document = window.document;
    const appBase = new URL('../', document.currentScript.src);
    let storage;
    try { storage = window.localStorage; } catch (_) { /* Private/blocked storage is optional. */ }
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const preference = createThemePreference(storage, 'cdg-parking.theme.v1:' + appBase.pathname, media && media.matches);
    function apply() {
      const theme = preference.value();
      document.documentElement.dataset.theme = theme;
      const browserColor = document.querySelector('meta[name="theme-color"]');
      if (browserColor) browserColor.content = theme === 'dark' ? '#32374f' : '#6068cf';
      const button = document.getElementById('themeButton');
      if (button) {
        const label = theme === 'dark' ? 'Activer le mode jour' : 'Activer le mode nuit';
        button.setAttribute('aria-label', label);
        button.title = label;
      }
    }
    // This script runs before the stylesheet and body, restoring the choice before paint.
    apply();
    document.addEventListener('DOMContentLoaded', () => {
      apply();
      document.getElementById('themeButton').addEventListener('click', () => { preference.toggle(); apply(); });
    }, { once: true });
    if (media) {
      const change = event => { preference.systemChanged(event.matches); apply(); };
      if (media.addEventListener) media.addEventListener('change', change);
      else if (media.addListener) media.addListener(change);
    }
    window.addEventListener('storage', event => {
      if (event.key === preference.key || event.key === null) { preference.reload(); apply(); }
    });
  }
  return { createThemePreference, initialize };
});
