'use strict';
// Mise à jour de l'application installée : la nouvelle version remplace le cache
// hors connexion sans toucher aux favoris, à l'historique ni aux brouillons.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { openApp, search, startServer } = require('./helpers');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/** Copie de public/ dont le service worker porte une autre version : la « version précédente ». */
function previousRelease() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdg-version-'));
  fs.cpSync(PUBLIC_DIR, dir, { recursive: true });
  const worker = path.join(dir, 'sw.js');
  const source = fs.readFileSync(worker, 'utf8');
  const previous = source.replace(/const CACHE_VERSION = '[^']+';/, "const CACHE_VERSION = 'version-precedente';");
  if (previous === source) throw new Error('Version du service worker introuvable');
  fs.writeFileSync(worker, previous);
  return dir;
}

function storageSnapshot(page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
}

test('une mise à jour conserve les favoris, l’historique et les brouillons', async ({ page }) => {
  const dir = previousRelease();
  const { url, stop } = await startServer({ publicDir: dir });
  try {
    await openApp(page, url);
    await expect(page.locator('#offlineStatus')).toHaveText('Disponible hors connexion', { timeout: 20_000 });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10_000 });

    // Préférences et brouillons créés avec la version précédente.
    await search(page, 'E22');
    await page.locator('#results .mapping-open').click();
    const detail = page.getByRole('dialog', { name: 'Détails de la correspondance' });
    await detail.getByRole('button', { name: 'Ajouter la correspondance E22 aux favoris' }).click();
    await detail.getByRole('button', { name: 'Proposer une correction' }).click();
    const correction = page.getByRole('dialog', { name: 'Proposer une correction' });
    await correction.getByLabel('Correction proposée').fill('K44');
    await correction.getByRole('button', { name: 'Fermer la contribution' }).click();
    await detail.getByRole('button', { name: 'Fermer les détails' }).click();
    await search(page, 'ZZ99');
    await page.locator('#results').getByRole('button', { name: 'Proposer un parking ou une correspondance' }).click();
    const proposal = page.getByRole('dialog', { name: 'Proposer un parking ou une correspondance' });
    await proposal.getByLabel('Code proposé').fill('ZZ98');
    await proposal.getByRole('button', { name: 'Fermer la contribution' }).click();
    await search(page, '');
    await expect(page.locator('#favoritesSection')).toBeVisible();
    await expect(page.locator('#historySection')).toBeVisible();
    const before = await storageSnapshot(page);
    expect(Object.keys(before).some(key => key.startsWith('cdg-parking.preferences.v1:'))).toBe(true);
    expect(Object.keys(before).some(key => key.startsWith('cdg-parking.contributions.v1:'))).toBe(true);

    // Publication de la nouvelle version, puis mise à jour proposée à l'agent.
    fs.cpSync(PUBLIC_DIR, dir, { recursive: true });
    await page.reload();
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    const updateButton = page.getByRole('button', { name: 'Nouvelle version · Actualiser' });
    await expect(updateButton).toBeVisible({ timeout: 20_000 });
    await Promise.all([page.waitForEvent('load'), updateButton.click()]);
    await page.locator('#resultsCount').filter({ hasText: /\S/ }).waitFor();

    const caches = await page.evaluate(async () => caches.keys());
    expect(caches.some(name => name.endsWith(':version-precedente'))).toBe(false);
    expect(caches).toHaveLength(1);
    expect(await storageSnapshot(page)).toEqual(before);
    await expect(page.locator('#favoritesSection').getByRole('button', { name: /Ouvrir le favori E22 ↔ K43/ })).toBeVisible();
    await expect(page.locator('#historySection').getByRole('button', { name: /Relancer la recherche E22/ })).toBeVisible();

    await search(page, 'ZZ99');
    await page.locator('#results').getByRole('button', { name: 'Proposer un parking ou une correspondance' }).click();
    await expect(page.getByRole('dialog', { name: 'Proposer un parking ou une correspondance' }).getByLabel('Code proposé')).toHaveValue('ZZ98');
  } finally {
    await stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
