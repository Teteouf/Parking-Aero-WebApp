'use strict';
// Proposition depuis une recherche « Parkings & portes » sans résultat.
const { test, expect } = require('@playwright/test');
const { createServer } = require('../src/server');
const { openApp, search } = require('./helpers');

const TITLE = 'Proposer un parking ou une correspondance';

function proposeButton(page) {
  return page.locator('#results').getByRole('button', { name: TITLE });
}

async function openProposal(page, query) {
  await search(page, query);
  await proposeButton(page).click();
  const form = page.getByRole('dialog', { name: TITLE });
  await expect(form).toBeVisible();
  return form;
}

async function fillProposal(form, { code = 'ZZ98', type = 'Porte', answer = '' } = {}) {
  await form.getByLabel('Code proposé').fill(code);
  await form.getByRole('radio', { name: new RegExp('^' + type) }).check();
  if (answer) await form.getByLabel('Porte ou parking associé').fill(answer);
  await form.getByLabel('Date de l’observation').fill('2026-11-15');
  await form.getByLabel('Origine de l’information').selectOption('signage');
  await form.getByRole('radio', { name: /Observation ponctuelle/ }).check();
  await expect(form.locator('#draftStatus')).toContainText('Brouillon enregistré sur cet appareil');
}

test.describe('Proposition depuis une recherche sans résultat', () => {
  test('le bouton n’apparaît que pour une recherche Parkings & portes non vide et sans résultat', async ({ page }) => {
    await openApp(page);
    await expect(proposeButton(page)).toHaveCount(0);
    await search(page, 'ZZ99');
    await expect(page.locator('#resultsCount')).toHaveText('0 correspondances');
    await expect(proposeButton(page)).toBeVisible();
    for (const found of ['E22', 'B20']) {
      await search(page, found);
      await expect(proposeButton(page)).toHaveCount(0);
    }
    await search(page, '');
    await expect(proposeButton(page)).toHaveCount(0);
    await page.getByRole('tab', { name: 'Codes IATA' }).click();
    await search(page, 'QQQQQ');
    await expect(page.locator('#results')).toContainText('Aucun code trouvé');
    await expect(proposeButton(page)).toHaveCount(0);
  });

  test('pas de proposition pour un code publié masqué par le filtre actif', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '2F', exact: true }).click();
    await search(page, 'E22');
    await expect(page.locator('#resultsCount')).toHaveText('0 correspondances');
    await expect(proposeButton(page)).toHaveCount(0);
    await search(page, 'ZZ99');
    await expect(proposeButton(page)).toBeVisible();
  });

  test('le code recherché est prérempli, modifiable, et la correspondance reste facultative', async ({ page }) => {
    await openApp(page);
    const form = await openProposal(page, 'zz 99');
    const code = form.getByLabel('Code proposé');
    await expect(code).toHaveValue('ZZ99');
    await expect(code).toBeFocused();
    await expect(form.locator('#contributionContext')).toContainText('zz 99');
    await expect(form.locator('#contributionContext')).toContainText('Aucune correspondance supposée');
    await expect(form.getByLabel('Porte ou parking associé')).not.toHaveAttribute('required', '');
    await expect(form).toContainText('pas encore transmise');
    await code.fill('ZZ98');
    await expect(code).toHaveValue('ZZ98');
  });

  test('champs invalides : code vide ou incorrect et nature du code manquante', async ({ page }) => {
    await openApp(page);
    const form = await openProposal(page, 'ZZ99');
    const code = form.getByLabel('Code proposé');
    await code.fill('');
    await form.getByRole('button', { name: 'Copier le message' }).click();
    await expect(code).toBeFocused();
    await expect(code).toHaveAttribute('aria-invalid', 'true');
    await expect(code).toHaveAccessibleDescription(/Erreur : indiquez un code/);
    await expect(form.getByRole('radio', { name: /^Porte/ })).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByLabel('Porte ou parking associé')).toHaveAttribute('aria-invalid', 'false');
    await expect(form.locator('#contributionOutcome')).toBeEmpty();

    await code.fill('ZZ 99!');
    await form.getByRole('button', { name: 'Copier le message' }).click();
    await expect(code).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('#contributionOutcome')).toBeEmpty();

    await code.fill('ZZ-99');
    await code.blur();
    await expect(code).toHaveAttribute('aria-invalid', 'false');
  });

  test('le brouillon est restauré après rechargement, propre au code recherché', async ({ page }) => {
    await openApp(page);
    const form = await openProposal(page, 'ZZ99');
    await fillProposal(form, { code: 'ZZ98', type: 'Porte', answer: 'K43' });
    await page.reload();
    const reopened = await openProposal(page, 'ZZ99');
    await expect(reopened.getByLabel('Code proposé')).toHaveValue('ZZ98');
    await expect(reopened.getByRole('radio', { name: /^Porte/ })).toBeChecked();
    await expect(reopened.getByLabel('Porte ou parking associé')).toHaveValue('K43');
    await expect(reopened.getByLabel('Origine de l’information')).toHaveValue('signage');
    await reopened.getByRole('button', { name: 'Fermer la contribution' }).click();

    const other = await openProposal(page, 'ZZ77');
    await expect(other.getByLabel('Code proposé')).toHaveValue('ZZ77');
    await expect(other.getByLabel('Porte ou parking associé')).toHaveValue('');
    await expect(other.locator('#draftStatus')).toHaveText('Aucun brouillon pour cette fiche.');
    await other.getByRole('button', { name: 'Fermer la contribution' }).click();

    const again = await openProposal(page, 'ZZ99');
    await again.getByRole('button', { name: 'Effacer le brouillon' }).click();
    await expect(again.getByLabel('Code proposé')).toHaveValue('ZZ99');
    await expect(again.getByLabel('Porte ou parking associé')).toHaveValue('');
  });

  test('deux recherches identiques sur 12 caractères gardent chacune leur brouillon', async ({ page }) => {
    await openApp(page);
    const first = await openProposal(page, 'ZZABCDEFGHIJ-UN');
    await expect(first.getByLabel('Code proposé')).toHaveValue('ZZABCDEFGHIJ');
    await fillProposal(first, { code: 'ZZ1', answer: 'K43' });
    await first.getByRole('button', { name: 'Fermer la contribution' }).click();

    const second = await openProposal(page, 'ZZABCDEFGHIJ-DEUX');
    await expect(second.getByLabel('Porte ou parking associé')).toHaveValue('');
    await expect(second.locator('#draftStatus')).toHaveText('Aucun brouillon pour cette fiche.');
    await fillProposal(second, { code: 'ZZ2' });
    await second.getByRole('button', { name: 'Fermer la contribution' }).click();

    await page.reload();
    const reopened = await openProposal(page, 'ZZABCDEFGHIJ-UN');
    await expect(reopened.getByLabel('Code proposé')).toHaveValue('ZZ1');
    await expect(reopened.getByLabel('Porte ou parking associé')).toHaveValue('K43');
  });

  test('le code proposé en minuscules est présenté en majuscules dans le message', async ({ page }) => {
    await openApp(page);
    const form = await openProposal(page, 'ZZ99');
    await fillProposal(form, { code: 'zz-98' });
    await form.getByRole('button', { name: 'Préparer un courriel' }).click();
    await expect(form.locator('#messagePreview')).toContainText('[CDG Parking] Proposition — ZZ-98');
    await expect(form.locator('#messagePreview')).toContainText('Code proposé : ZZ-98');
  });

  test('préparer un courriel indique que rien n’est transmis', async ({ page }) => {
    await openApp(page);
    const form = await openProposal(page, 'ZZ99');
    await fillProposal(form);
    await form.getByRole('button', { name: 'Préparer un courriel' }).click();
    await expect(form.locator('#contributionOutcome')).toContainText('Rien n’est transmis tant que vous ne l’envoyez pas vous-même');
    await expect(form.locator('#draftStatus')).toContainText('Non transmis');
    await expect(form.locator('#messagePreview')).toContainText('Correspondance : non indiquée (aucune n’est supposée)');
  });

  test('copier le message de proposition', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Permissions presse-papiers propres à Chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page);
    const form = await openProposal(page, 'ZZ99');
    await fillProposal(form, { code: 'ZZ98', type: 'Je ne sais pas' });
    await form.getByRole('button', { name: 'Copier le message' }).click();
    await expect(form.locator('#contributionOutcome')).toHaveText(/Message copié.*pas encore transmis/);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('[CDG Parking] Proposition — ZZ98');
    expect(copied).toContain('Recherche sans résultat : ZZ99');
    expect(copied).toContain('Nature du code : Je ne sais pas');
  });

  test('après une proposition, une correction de fiche retrouve son formulaire habituel', async ({ page }) => {
    await openApp(page);
    const form = await openProposal(page, 'ZZ99');
    await fillProposal(form);
    await form.getByRole('button', { name: 'Fermer la contribution' }).click();
    await search(page, 'E22');
    await page.locator('#results .mapping-open').click();
    await page.getByRole('button', { name: 'Proposer une correction' }).click();
    const correction = page.getByRole('dialog', { name: 'Proposer une correction' });
    await expect(correction.getByLabel('Correction proposée')).toHaveValue('K43');
    await expect(correction.getByLabel('Code proposé')).toBeHidden();
    await expect(correction.locator('#proposalFields')).toBeHidden();
  });

  test('les données publiées, les favoris et l’historique ne changent pas', async ({ page }) => {
    await openApp(page);
    await search(page, 'E22');
    await page.locator('#results .mapping-open').click();
    await page.getByRole('dialog', { name: 'Détails de la correspondance' })
      .getByRole('button', { name: 'Ajouter la correspondance E22 aux favoris' }).click();
    await page.getByRole('button', { name: 'Fermer les détails' }).click();
    const key = await page.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('cdg-parking.preferences.v1:')));
    const before = await page.evaluate(k => localStorage.getItem(k), key);
    const form = await openProposal(page, 'ZZ99');
    await fillProposal(form, { answer: 'K43' });
    await form.getByRole('button', { name: 'Préparer un courriel' }).click();
    expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
    await page.reload();
    await expect(page.locator('#resultsCount')).toHaveText('169 points de parking');
    await expect(page.locator('#favoritesSection').getByRole('button', { name: /Ouvrir le favori E22 ↔ K43/ })).toBeVisible();
    await search(page, 'ZZ98');
    await expect(page.locator('#resultsCount')).toHaveText('0 correspondances');
  });
});

// Serveur dédié, réellement arrêté : seul le service worker sert l'application.
test('hors connexion : la proposition et son brouillon restent disponibles', async ({ page, context }) => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let stopped = false;
  const stopServer = () => new Promise(resolve => {
    if (stopped) return resolve();
    stopped = true;
    server.closeAllConnections();
    server.close(() => resolve());
  });
  try {
    await openApp(page, origin + '/');
    await expect(page.locator('#offlineStatus')).toHaveText('Disponible hors connexion', { timeout: 20_000 });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10_000 });
    await stopServer();
    await context.setOffline(true);
    await page.reload();
    const form = await openProposal(page, 'ZZ99');
    await fillProposal(form, { code: 'ZZ97', type: 'Parking' });
    await page.reload();
    const reopened = await openProposal(page, 'ZZ99');
    await expect(reopened.getByLabel('Code proposé')).toHaveValue('ZZ97');
    await expect(reopened.getByRole('radio', { name: /^Parking/ })).toBeChecked();
  } finally {
    await context.setOffline(false).catch(() => {});
    await stopServer();
  }
});
