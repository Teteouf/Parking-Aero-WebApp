'use strict';
const { test, expect } = require('@playwright/test');
const { openApp, search } = require('./helpers');
const data = require('../public/js/extension-data');

// Décomptes attendus par terminal intégré (postes, portes).
const EXPECTED = { '2A': [18, 14], '2B': [21, 17], '2C': [14, 12], '2D': [20, 17] };

async function chooseTerminal(page, terminal) {
  const more = page.locator('#filterMoreButton');
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
  await page.locator(`[data-filter="${terminal}"]`).click();
}

test.describe('Extension aux terminaux 2A à 2D', () => {
  test('le démarrage affiche toujours les 169 correspondances', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#resultsCount')).toHaveText('169 points de parking');
    await expect(page.locator('#results .mapping-card')).toHaveCount(169);
    await expect(page.locator('#results .stand-card')).toHaveCount(0);
  });

  for (const terminal of data.terminalsIncluded) {
    test(`filtre ${terminal} : postes et portes documentés, compteurs adaptés`, async ({ page }) => {
      const [stands, gates] = EXPECTED[terminal];
      await openApp(page);
      await chooseTerminal(page, terminal);
      await expect(page.locator('#searchHint')).toHaveText(`Terminal ${terminal}`);
      await expect(page.locator('#filterMoreButton')).toHaveText('Moins · 1');
      await expect(page.locator('#resultsCount')).toHaveText(`0 correspondances · ${stands} parkings documentés · ${gates} portes documentées`);
      await expect(page.locator('#results [data-documented="stand"]')).toHaveCount(stands);
      await expect(page.locator('#results [data-documented="gate"]')).toHaveCount(gates);
      await expect(page.locator('#results .mapping-card')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test('A38 : le poste et la porte du même code restent distincts', async ({ page }) => {
    await openApp(page);
    await search(page, 'A38');
    await expect(page.locator('#resultsCount')).toHaveText('0 correspondances · 1 parking documenté · 1 porte documentée');
    await expect(page.locator('[data-documented="stand"]')).toHaveAccessibleName('Parking A38, porte à confirmer, Terminal à confirmer (secteur 2A), détails');
    await expect(page.locator('[data-documented="gate"]')).toHaveAccessibleName('Porte A38, parking à confirmer, Terminal 2A, détails');
    await expect(page.locator('[data-documented="stand"] .badge.pending')).toHaveText('Terminal à confirmer');
    await expect(page.locator('[data-documented="stand"] .match-role')).toHaveText('A38 est ici le parking');
    await expect(page.locator('[data-documented="gate"] .match-role')).toHaveText('A38 est ici la porte');
  });

  test('un poste face au bâtiment A affiche « Porte à confirmer » et ses sources', async ({ page }) => {
    await openApp(page);
    await search(page, 'a 10');
    await page.locator('[data-documented="stand"]').click();
    const detail = page.getByRole('dialog', { name: 'Parking documenté' });
    await expect(detail.locator('.gate-pending')).toHaveText('À confirmer');
    await expect(detail).toContainText('Fait face au bâtiment « A » sur APDC 01');
    await expect(detail).toContainText('Aucune carte eAIP n’écrit « 2A »');
    await expect(detail.getByRole('button', { name: 'Je connais la porte' })).toBeVisible();
  });

  test('une porte 2A propose « Je connais le parking » et prépare le bon message', async ({ page }) => {
    await openApp(page);
    await search(page, 'A40');
    await page.locator('[data-documented="gate"]').click();
    const detail = page.getByRole('dialog', { name: 'Porte documentée' });
    await expect(detail).toContainText('Plan interactif Paris Aéroport');
    await detail.getByRole('button', { name: 'Je connais le parking' }).click();
    const form = page.getByRole('dialog', { name: 'Je connais le parking' });
    await expect(form.locator('#contributionContext')).toContainText('PorteA40');
    await form.getByLabel('Parking desservi').fill('A10');
    await form.getByLabel('Date de l’observation').fill('2026-11-14');
    await form.getByLabel('Origine de l’information').selectOption('seen');
    await form.getByRole('radio', { name: /Observation ponctuelle/ }).check();
    await form.getByRole('button', { name: 'Préparer un courriel' }).click();
    await expect(form.locator('#messagePreview')).toContainText('- Porte : A40');
    await expect(form.locator('#messagePreview')).toContainText('- Parking proposé : A10');
  });

  test('la recherche dans l’historique fonctionne pour un poste documenté', async ({ page }) => {
    await openApp(page);
    const input = await search(page, 'A12');
    await input.press('Enter');
    await search(page, '');
    await expect(page.locator('#historyList')).toContainText('A12');
  });
});
