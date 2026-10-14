'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createThemePreference, initialize } = require('../public/js/theme');

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

test('the first visit follows the device, then the manual choice survives reopening and system changes', () => {
  const storage = memoryStorage();
  const theme = createThemePreference(storage, 'theme', true);
  assert.equal(theme.value(), 'dark');
  theme.systemChanged(false);
  assert.equal(theme.value(), 'light');
  assert.equal(theme.toggle(), 'dark');
  theme.systemChanged(false);
  assert.equal(theme.value(), 'dark');
  const reopened = createThemePreference(storage, 'theme', false);
  assert.equal(reopened.value(), 'dark');
  assert.equal(reopened.toggle(), 'light');
  assert.equal(createThemePreference(storage, 'theme', true).value(), 'light');
});

test('invalid preferences and denied or full storage never prevent switching', () => {
  const invalid = memoryStorage();
  invalid.setItem('theme', 'unexpected');
  assert.equal(createThemePreference(invalid, 'theme', true).value(), 'dark');
  const denied = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Full'); } };
  for (const storage of [undefined, denied]) {
    const theme = createThemePreference(storage, 'theme', false);
    assert.equal(theme.toggle(), 'dark');
    theme.systemChanged(false);
    assert.equal(theme.value(), 'dark');
    assert.equal(theme.toggle(), 'light');
  }
});

test('theme choices are scoped and reload external changes without touching favorites', () => {
  const storage = memoryStorage();
  storage.setItem('favorites', 'keep');
  const first = createThemePreference(storage, '/first/', false);
  first.toggle();
  assert.equal(createThemePreference(storage, '/second/', false).value(), 'light');
  storage.setItem('/first/', 'light');
  first.reload();
  assert.equal(first.value(), 'light');
  storage.setItem('/first/', '');
  first.reload();
  first.systemChanged(true);
  assert.equal(first.value(), 'dark');
  assert.equal(storage.getItem('favorites'), 'keep');
});

test('startup restores night mode before the body exists, then wires an accessible live switch', () => {
  const storage = memoryStorage();
  const key = 'cdg-parking.theme.v1:/agents/';
  storage.setItem(key, 'dark');
  const documentEvents = {}, windowEvents = {}, mediaEvents = {}, buttonEvents = {};
  const meta = {};
  let bodyExists = false;
  const button = { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener(type, callback) { buttonEvents[type] = callback; } };
  const document = {
    currentScript: { src: 'https://example.test/agents/js/theme.js' }, documentElement: { dataset: {} },
    querySelector: () => meta, getElementById: () => bodyExists ? button : null,
    addEventListener(type, callback) { documentEvents[type] = callback; }
  };
  initialize({ document, localStorage: storage,
    matchMedia: () => ({ matches: false, addEventListener(type, callback) { mediaEvents[type] = callback; } }),
    addEventListener(type, callback) { windowEvents[type] = callback; }
  });
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(meta.content, '#32374f');
  bodyExists = true;
  documentEvents.DOMContentLoaded();
  assert.equal(button.attributes['aria-label'], 'Activer le mode jour');
  buttonEvents.click();
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(button.attributes['aria-label'], 'Activer le mode nuit');
  assert.equal(storage.getItem(key), 'light');
  mediaEvents.change({ matches: true });
  assert.equal(document.documentElement.dataset.theme, 'light');
  storage.setItem(key, 'dark');
  windowEvents.storage({ key });
  assert.equal(document.documentElement.dataset.theme, 'dark');
});

test('the theme script loads before CSS and is available in the offline bundle', () => {
  const publicDir = path.join(__dirname, '../public');
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert(html.indexOf('src="js/theme.js"') < html.indexOf('href="css/app.css"'));
  const worker = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
  assert(worker.includes('"js/theme.js"'));
});
