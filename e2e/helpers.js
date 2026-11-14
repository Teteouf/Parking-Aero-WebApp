'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/** Charge les 169 correspondances réelles depuis public/js/mappings.js. */
function loadMappings() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'mappings.js'), 'utf8'), sandbox);
  return JSON.parse(JSON.stringify(sandbox.window.PARKING_MAPPINGS));
}

/** Ouvre l'application sur un appareil vierge et attend le premier rendu. */
async function openApp(page, url = './') {
  await page.goto(url);
  await page.locator('#resultsCount').filter({ hasText: /\S/ }).waitFor();
}

async function search(page, text) {
  const input = page.getByRole('searchbox');
  await input.fill(text);
  return input;
}

/** Cartes de correspondance affichées (parking, portes, ligne terminal). */
async function visibleMappings(page) {
  return page.locator('#results .mapping-card').evaluateAll(cards => cards.map(card => ({
    parking: card.querySelector('.point-code:not(.gate-code)').textContent.trim(),
    gates: card.querySelector('.gate-code').textContent.trim(),
    meta: card.querySelector('.mapping-meta').textContent.trim(),
  })));
}

module.exports = { loadMappings, openApp, search, visibleMappings };
