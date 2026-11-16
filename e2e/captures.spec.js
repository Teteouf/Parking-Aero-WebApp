'use strict';
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { openApp, search } = require('./helpers');

// Captures de contrôle visuel (non comparées) : e2e-captures/<projet>-*.png
test('capture de l’application', async ({ page }, testInfo) => {
  const dir = path.join(__dirname, '..', 'e2e-captures');
  await openApp(page);
  await expect(page.locator('#offlineStatus')).toHaveText('Disponible hors connexion', { timeout: 20_000 });
  await page.screenshot({ path: path.join(dir, `${testInfo.project.name}-accueil.png`) });
  await search(page, 'E22');
  await expect(page.locator('#results .mapping-card')).toHaveCount(1);
  await page.screenshot({ path: path.join(dir, `${testInfo.project.name}-recherche-E22.png`) });
});
