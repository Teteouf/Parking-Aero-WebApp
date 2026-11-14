'use strict';
const { test, expect } = require('@playwright/test');
const { createServer } = require('../src/server');
const { openApp, search, visibleMappings } = require('./helpers');

async function openStand(page, code) {
  await search(page, code);
  await page.locator('#results [data-documented="stand"]').click();
  await expect(page.getByRole('dialog', { name: 'Parking documenté' })).toBeVisible();
}

async function fillGateDraft(page, gate = 'B22') {
  const form = page.getByRole('dialog', { name: 'Je connais la porte' });
  await form.getByLabel('Porte utilisée').fill(gate);
  await form.getByLabel('Date de l’observation').fill('2026-11-14');
  await form.getByLabel('Origine de l’information').selectOption('seen');
  await form.getByRole('radio', { name: /Fonctionnement habituel/ }).check();
  await form.getByLabel('Conditions éventuelles').fill('Vols Schengen');
  await expect(page.locator('#draftStatus')).toContainText('Brouillon enregistré sur cet appareil');
  return form;
}

test.describe('Vérification et pilote 2B', () => {
  test('les recherches existantes ne changent pas', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#resultsCount')).toHaveText('169 points de parking');
    await expect(page.locator('#results .stand-card')).toHaveCount(0);
    await search(page, 'E22');
    await expect(page.locator('#resultsCount')).toHaveText('1 correspondance');
    expect(await visibleMappings(page)).toEqual([{ parking: 'E22', gates: 'K43', meta: 'Terminal 2E - Porte K' }]);
  });

  for (const code of ['B20', 'B24', 'B26']) {
    test(`${code} est un poste documenté, porte à confirmer, distinct des correspondances`, async ({ page }) => {
      await openApp(page);
      await search(page, code);
      await expect(page.locator('#resultsCount')).toHaveText('0 correspondances · 1 parking documenté · 1 porte documentée');
      await expect(page.locator('#results .mapping-card')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Parkings et portes documentés · terminaux 2A à 2D' })).toBeVisible();
      const card = page.locator('#results .stand-card').filter({ has: page.locator('[data-documented="stand"]') });
      await expect(card).toHaveCount(1);
      // La porte du même code est affichée à part, sans lien avec le poste.
      await expect(page.locator('#results [data-documented="gate"]')).toHaveAccessibleName(`Porte ${code}, parking à confirmer, Terminal 2B, détails`);
      await expect(card.locator('.point-code').first()).toHaveText(code);
      await expect(card.locator('.gate-pending')).toHaveText('À confirmer');
      await expect(card.locator('.gate-code')).toHaveCount(0);
      await expect(card.locator('.mapping-open')).toHaveAccessibleName(`Parking ${code}, porte à confirmer, Terminal 2B, détails`);
      await card.locator('.mapping-open').click();
      const detail = page.getByRole('dialog', { name: 'Parking documenté' });
      await expect(detail).toContainText('Porte à confirmer');
      await expect(detail).toContainText('AD 2 LFPG APDC 01');
      await expect(detail).toContainText('ne fait pas partie des 169 correspondances');
      await expect(detail.getByRole('button', { name: 'Je connais la porte' })).toBeVisible();
      await expect(detail.getByRole('button', { name: 'Confirmer cette information' })).toHaveCount(0);
    });
  }

  test('un filtre de terminal masque les postes documentés', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '2E', exact: true }).click();
    await search(page, 'B20');
    await expect(page.locator('#results .stand-card')).toHaveCount(0);
  });

  test('état de vérification : fiche validée par le responsable et fiche à documenter', async ({ page }) => {
    await openApp(page);
    await search(page, 'F21');
    const card = page.locator('#results .mapping-card');
    await expect(card.locator('.badge.verified')).toHaveText('Validée par le responsable');
    await card.locator('.mapping-open').click();
    let detail = page.getByRole('dialog', { name: 'Détails de la correspondance' });
    await expect(detail.locator('.verification')).toContainText('Validée par le responsable');
    await expect(detail.locator('.verification')).toContainText('pas une observation terrain datée');
    await expect(detail.locator('.verification')).toContainText('Non documentées');
    await detail.getByRole('button', { name: 'Fermer les détails' }).click();

    await search(page, 'E22');
    await expect(page.locator('#results .badge.verified')).toHaveCount(0);
    await page.locator('#results .mapping-open').click();
    detail = page.getByRole('dialog', { name: 'Détails de la correspondance' });
    await expect(detail.locator('.verification')).toContainText('Vérification à documenter');
    await expect(detail.locator('.verification')).toContainText('ne signifie pas qu’elle est erronée');
    await expect(detail.getByRole('button', { name: 'Confirmer cette information' })).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Proposer une correction' })).toBeVisible();
  });

  test('confirmer une fiche reprend les valeurs affichées', async ({ page }) => {
    await openApp(page);
    await search(page, 'F21');
    await page.locator('#results .mapping-open').click();
    await page.getByRole('button', { name: 'Confirmer cette information' }).click();
    const form = page.getByRole('dialog', { name: 'Confirmer cette information' });
    await expect(form.locator('#confirmStatement')).toHaveText('Vous confirmez : parking F21 → porte F21.');
    await expect(form.getByLabel('Porte utilisée')).toHaveCount(0);
    await expect(form.getByLabel('Date de l’observation')).toBeFocused();
    await expect(form.locator('#contributionContext')).toContainText('Validée par le responsable');
  });

  test('proposer une correction préremplit la porte affichée', async ({ page }) => {
    await openApp(page);
    await search(page, 'E22');
    await page.locator('#results .mapping-open').click();
    await page.getByRole('button', { name: 'Proposer une correction' }).click();
    await expect(page.getByRole('dialog', { name: 'Proposer une correction' }).getByLabel('Correction proposée')).toHaveValue('K43');
  });

  test('formulaire : erreurs accessibles, puis brouillon conservé après rechargement', async ({ page }) => {
    await openApp(page);
    await openStand(page, 'B20');
    await page.getByRole('button', { name: 'Je connais la porte' }).click();
    const form = page.getByRole('dialog', { name: 'Je connais la porte' });
    const answer = form.getByLabel('Porte utilisée');
    await expect(answer).toBeFocused();
    await expect(answer).toHaveAttribute('aria-invalid', 'false');

    await form.getByRole('button', { name: 'Copier le message' }).click();
    await expect(answer).toBeFocused();
    await expect(answer).toHaveAttribute('aria-invalid', 'true');
    await expect(answer).toHaveAccessibleDescription(/Erreur : indiquez la valeur proposée/);
    await expect(form.getByLabel('Origine de l’information')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('#contributionOutcome')).toBeEmpty();

    await fillGateDraft(page);
    await expect(answer).toHaveAttribute('aria-invalid', 'false');

    await page.reload();
    await openStand(page, 'B20');
    await page.getByRole('button', { name: 'Je connais la porte' }).click();
    const reopened = page.getByRole('dialog', { name: 'Je connais la porte' });
    await expect(reopened.getByLabel('Porte utilisée')).toHaveValue('B22');
    await expect(reopened.getByLabel('Date de l’observation')).toHaveValue('2026-11-14');
    await expect(reopened.getByLabel('Origine de l’information')).toHaveValue('seen');
    await expect(reopened.getByRole('radio', { name: /Fonctionnement habituel/ })).toBeChecked();
    await expect(reopened.getByLabel('Conditions éventuelles')).toHaveValue('Vols Schengen');

    await reopened.getByRole('button', { name: 'Effacer le brouillon' }).click();
    await expect(reopened.getByLabel('Porte utilisée')).toHaveValue('');
    await expect(page.locator('#draftStatus')).toHaveText('Brouillon effacé de cet appareil.');
  });

  test('copier le message ne prétend pas qu’il a été transmis', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Permissions presse-papiers propres à Chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page);
    await openStand(page, 'B24');
    await page.getByRole('button', { name: 'Je connais la porte' }).click();
    const form = await fillGateDraft(page, 'B23');
    await form.getByRole('button', { name: 'Copier le message' }).click();
    await expect(form.locator('#contributionOutcome')).toHaveText(/Message copié.*pas encore transmis/);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('[CDG Parking] Porte proposée — B24');
    expect(copied).toContain('Porte proposée : B23');
    expect(copied).toContain('Nature : Fonctionnement habituel');
  });

  test('préparer un courriel n’affiche aucun accusé de réception', async ({ page }) => {
    await openApp(page);
    await openStand(page, 'B26');
    await page.getByRole('button', { name: 'Je connais la porte' }).click();
    const form = await fillGateDraft(page);
    await form.getByRole('button', { name: 'Préparer un courriel' }).click();
    const outcome = form.locator('#contributionOutcome');
    await expect(outcome).toContainText('Rien n’est transmis tant que vous ne l’envoyez pas vous-même');
    await expect(outcome).not.toContainText(/envoyé|reçu|merci/i);
    await expect(page.locator('#draftStatus')).toContainText('Non transmis');
  });

  test('le mode sombre garde un contraste suffisant sur les nouveaux éléments', async ({ page }) => {
    await openApp(page);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await search(page, 'B20');
      const ratio = await page.locator('#results [data-documented="stand"] .gate-pending').evaluate(element => {
        const rgb = value => value.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
        const lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        const fg = lum(rgb(getComputedStyle(element).color));
        const bg = lum(rgb(getComputedStyle(element.closest('.stand-card')).backgroundColor));
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      });
      expect(ratio, theme).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// Serveur dédié, réellement arrêté : seul le service worker sert l'application.
test('hors connexion : le pilote 2B et le brouillon restent disponibles', async ({ page, context }) => {
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
    await expect(page.locator('#resultsCount')).toHaveText('169 points de parking');

    await openStand(page, 'B20');
    await page.getByRole('button', { name: 'Je connais la porte' }).click();
    await fillGateDraft(page, 'B21');

    await page.reload();
    await openStand(page, 'B20');
    await page.getByRole('button', { name: 'Je connais la porte' }).click();
    await expect(page.getByRole('dialog', { name: 'Je connais la porte' }).getByLabel('Porte utilisée')).toHaveValue('B21');
  } finally {
    await context.setOffline(false).catch(() => {});
    await stopServer();
  }
});
