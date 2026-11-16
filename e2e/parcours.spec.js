'use strict';
const { test, expect } = require('@playwright/test');
const { loadMappings, openApp, search, visibleMappings } = require('./helpers');

const mappings = loadMappings();

test.describe('Recherche parking ↔ porte', () => {
  test('les 169 correspondances sont affichées au démarrage', async ({ page }) => {
    expect(mappings).toHaveLength(169);
    await openApp(page);
    await expect(page.locator('#resultsCount')).toHaveText('169 points de parking');
    await expect(page.locator('#results .mapping-card')).toHaveCount(169);
  });

  test('E22 → K43', async ({ page }) => {
    await openApp(page);
    await search(page, 'E22');
    await expect(page.locator('#resultsCount')).toHaveText('1 correspondance');
    expect(await visibleMappings(page)).toEqual([{ parking: 'E22', gates: 'K43', meta: 'Terminal 2E - Porte K' }]);
  });

  test('K43 → E22', async ({ page }) => {
    await openApp(page);
    await search(page, 'K43');
    await expect(page.locator('#resultsCount')).toHaveText('1 correspondance');
    expect(await visibleMappings(page)).toEqual([{ parking: 'E22', gates: 'K43', meta: 'Terminal 2E - Porte K' }]);
  });

  test('F32 ambigu : poste avion d’abord, rôle visible et annoncé sur chaque carte', async ({ page }) => {
    await openApp(page);
    await search(page, 'F32');
    await expect(page.locator('#resultsCount')).toHaveText('2 correspondances');
    expect(await visibleMappings(page)).toEqual([
      { parking: 'F32', gates: 'F35', meta: 'Terminal 2F - Porte F1' },
      { parking: 'F22', gates: 'F32', meta: 'Terminal 2F - Porte F1' },
    ]);
    const cards = page.locator('#results .mapping-card');
    await expect(cards.nth(0).locator('.match-role')).toHaveText('F32 est ici le parking');
    await expect(cards.nth(1).locator('.match-role')).toHaveText('F32 est ici la porte');
    await expect(cards.nth(0).locator('.is-match .code-hit')).toHaveText('F32');
    await expect(cards.nth(1).locator('.is-match .code-hit')).toHaveText('F32');
    await expect(cards.nth(0).locator('.mapping-open')).toHaveAccessibleName('F32 est ici le parking (poste avion). Parking F32, porte F35, détails');
    await expect(cards.nth(1).locator('.mapping-open')).toHaveAccessibleName('F32 est ici la porte. Parking F22, porte F32, détails');
  });

  test('F21 → F21 : le même code est annoncé comme parking et porte', async ({ page }) => {
    await openApp(page);
    await search(page, 'F21');
    await expect(page.locator('#resultsCount')).toHaveText('1 correspondance');
    expect(await visibleMappings(page)).toEqual([{ parking: 'F21', gates: 'F21', meta: 'Terminal 2F - Porte F1' }]);
    const card = page.locator('#results .mapping-card');
    await expect(card.locator('.match-role')).toHaveText('F21 est ici parking et porte');
    await expect(card.locator('.is-match')).toHaveCount(2);
    await expect(card.locator('.code-hit')).toHaveText(['F21', 'F21']);
    await expect(card.locator('.point-code:not(.gate-code) .code-hit')).toHaveCSS('text-decoration-line', 'underline');
    await expect(card.locator('.gate-code .code-hit')).toHaveCSS('text-decoration-line', 'underline');
    await expect(card.locator('.mapping-open')).toHaveAccessibleName('F21 est ici à la fois le parking (poste avion) et la porte. Parking F21, porte F21, détails');
  });

  test('F3 indique le rôle du code normalisé F03', async ({ page }) => {
    await openApp(page);
    await search(page, 'F3');
    await expect(page.locator('#results .match-role')).toHaveText('F03 est ici le parking');
  });

  test('F3 retrouve F03', async ({ page }) => {
    const expected = mappings.find(m => m.parkingCode === 'F03');
    await openApp(page);
    await search(page, 'F3');
    await expect(page.locator('#resultsCount')).toHaveText('1 correspondance');
    const [card] = await visibleMappings(page);
    expect(card.parking).toBe('F03');
    expect(card.gates).toBe(expected.gates.join(', '));
  });
});

test.describe('Filtres de terminal', () => {
  const cases = [
    { label: '2E', heading: 'Terminal 2E', expected: m => m.terminal === '2E' },
    { label: '2F', heading: 'Terminal 2F', expected: m => m.terminal === '2F' },
    { label: '2G', heading: 'Terminal 2G', expected: m => m.terminal === '2G' },
    { label: 'Terminal 1', heading: 'Terminal 1', more: true, expected: m => m.terminal.startsWith('1') },
    { label: 'Rampe / ascenseur', heading: 'Rampe / ascenseur', more: true, expected: m => m.ramp || m.elevator },
  ];

  for (const item of cases) {
    test(`filtre ${item.label}`, async ({ page }) => {
      const expected = mappings.filter(item.expected).map(m => m.parkingCode);
      expect(expected.length).toBeGreaterThan(0);
      await openApp(page);
      if (item.more) await page.getByRole('button', { name: 'Afficher les autres filtres' }).click();
      const filter = page.locator('#parkingFilters').getByRole('button', { name: item.label, exact: true });
      await filter.click();
      await expect(filter).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#searchHint')).toHaveText(item.heading);
      await expect(page.locator('#resultsCount')).toHaveText(`${expected.length} correspondance${expected.length === 1 ? '' : 's'}`);
      expect((await visibleMappings(page)).map(card => card.parking)).toEqual(expected);
    });
  }

  test('un filtre combiné à une recherche hors terminal ne renvoie rien, puis « Tous » la retrouve', async ({ page }) => {
    await openApp(page);
    await page.locator('#parkingFilters').getByRole('button', { name: '2F', exact: true }).click();
    await search(page, 'K43');
    // L'application affiche « 0 correspondances » (pluriel). Libellé constaté, signalé à part :
    // l'usage français recommande le singulier après zéro. Le test vérifie ici l'absence de résultat.
    await expect(page.locator('#resultsCount')).toHaveText('0 correspondances');
    await expect(page.locator('#results .mapping-card')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Aucune correspondance' })).toBeVisible();
    await page.locator('#parkingFilters').getByRole('button', { name: 'Tous', exact: true }).click();
    expect((await visibleMappings(page)).map(card => card.parking)).toEqual(['E22']);
  });
});

test.describe('Favoris', () => {
  test('ajout et suppression d’un favori, conservés après rechargement', async ({ page }) => {
    await openApp(page);
    await search(page, 'E22');
    await page.getByRole('button', { name: 'Ajouter la correspondance E22 aux favoris' }).click();
    await expect(page.getByRole('button', { name: 'Retirer la correspondance E22 des favoris' })).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await page.locator('#resultsCount').filter({ hasText: /\S/ }).waitFor();
    const favorites = page.locator('#favoritesSection');
    await expect(favorites).toBeVisible();
    await expect(favorites.getByRole('button', { name: /Ouvrir le favori E22 ↔ K43/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retirer la correspondance E22 des favoris' })).toBeVisible();

    await favorites.getByRole('button', { name: 'Retirer E22 ↔ K43 des favoris' }).click();
    await expect(favorites).toBeHidden();
    await expect(page.getByRole('button', { name: 'Ajouter la correspondance E22 aux favoris' })).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await page.locator('#resultsCount').filter({ hasText: /\S/ }).waitFor();
    await expect(page.locator('#favoritesSection')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Ajouter la correspondance E22 aux favoris' })).toBeVisible();
  });
});

test.describe('Codes IATA', () => {
  test('recherche du code IATA CDG', async ({ page }) => {
    await openApp(page);
    await page.getByRole('tab', { name: 'Codes IATA' }).click();
    await expect(page.getByRole('tab', { name: 'Codes IATA' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#resultsCount')).toHaveText(/entrées IATA/);
    await search(page, 'CDG');
    await expect(page.locator('#resultsCount')).toHaveText('1 résultat');
    const card = page.locator('#results .iata-card');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.iata-code')).toHaveText('CDG');
    await expect(card.getByRole('heading')).toHaveText('Charles de Gaulle International Airport');
    await expect(card).toContainText('Paris');
    await expect(card).toContainText('Code ville : PAR');
  });
});
