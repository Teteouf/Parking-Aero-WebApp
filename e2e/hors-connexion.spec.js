'use strict';
const { test, expect } = require('@playwright/test');
const { BASE_PATH, openApp, search, startServer, visibleMappings } = require('./helpers');

// Ce scénario démarre son propre serveur pour pouvoir l'arrêter réellement :
// après la préparation du cache, l'origine ne répond plus du tout ET le
// navigateur est passé hors ligne. Seul le service worker peut alors servir l'app.
test('après préparation du cache, l’app recharge et recherche sans réseau', async ({ page, context }) => {
  const { url: appUrl, stop: stopServer } = await startServer();

  try {
    // 1. Première visite en ligne : le service worker doit tout enregistrer.
    await openApp(page, appUrl);
    await expect(page.locator('#offlineStatus')).toHaveText('Disponible hors connexion', { timeout: 20_000 });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10_000 });
    const cached = await page.evaluate(async () => {
      const urls = [];
      for (const name of await caches.keys()) {
        for (const request of await (await caches.open(name)).keys()) urls.push(new URL(request.url).pathname);
      }
      return urls;
    });
    for (const asset of ['index.html', 'js/app.js', 'js/core.js', 'js/mappings.js', 'js/preferences.js', 'css/app.css', 'data/iata.json']) {
      expect(cached, `ressource en cache : ${asset}`).toContain(BASE_PATH + asset);
    }

    // 2. Coupure réelle : serveur arrêté, puis navigateur hors ligne.
    await stopServer();
    await expect(fetch(appUrl), 'le serveur doit être injoignable').rejects.toThrow();
    await context.setOffline(true);
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    const bypass = await page.evaluate(async url => {
      try { await fetch(url, { cache: 'no-store' }); return 'reachable'; } catch (_) { return 'unreachable'; }
    }, appUrl + '__absent-du-cache__.json');
    expect(bypass, 'une ressource absente du cache ne doit pas être joignable').toBe('unreachable');

    // 3. Rechargement sans réseau.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'CDG Parking', level: 1 })).toBeVisible();
    await expect(page.locator('#resultsCount')).toHaveText('169 points de parking');
    await expect(page.locator('#offlineStatus')).toHaveText('Hors connexion · données disponibles', { timeout: 10_000 });

    // 4. Recherches parking dans les deux sens.
    await search(page, 'E22');
    expect(await visibleMappings(page)).toEqual([{ parking: 'E22', gates: 'K43', meta: 'Terminal 2E - Porte K' }]);
    await search(page, 'K43');
    expect((await visibleMappings(page)).map(card => card.parking)).toEqual(['E22']);

    // 5. Recherche IATA depuis le répertoire enregistré localement.
    await page.getByRole('tab', { name: 'Codes IATA' }).click();
    await search(page, 'CDG');
    await expect(page.locator('#resultsCount')).toHaveText('1 résultat');
    await expect(page.locator('#results .iata-card .iata-code')).toHaveText('CDG');
    await expect(page.locator('#results .iata-card').getByRole('heading')).toHaveText('Charles de Gaulle International Airport');
  } finally {
    await context.setOffline(false).catch(() => {});
    await stopServer();
  }
});
