'use strict';
// Tests navigateur (Playwright). Les tests Node restent dans tests/ et passent par `npm test`.
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.E2E_PORT || 4173);
// E2E_BASE_PATH=/Parking-Aero-WebApp/ rejoue les tests sous le chemin publié sur GitHub Pages.
const BASE_PATH = process.env.E2E_BASE_PATH || '/';

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'ordinateur-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      // Émulation mobile : Chromium de bureau avec la fenêtre, le user-agent,
      // le tactile et la densité d'un Pixel 7. Ce n'est pas un vrai téléphone.
      name: 'emulation-mobile-pixel7',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // Régénère sw.js pour que le cache hors connexion corresponde aux fichiers servis.
    command: 'npm run build && node src/server.js',
    url: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    env: { PORT: String(PORT), HOST: '127.0.0.1', BASE_PATH },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
