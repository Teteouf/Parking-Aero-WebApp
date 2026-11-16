# CDG Parking — consignes

Application web statique (PWA) destinée aux agents et aux entreprises travaillant
à l'aéroport Paris-Charles de Gaulle : correspondances parking ↔ porte et
répertoire IATA, utilisables hors connexion.

## Commandes

- `npm start` : serveur local sur http://127.0.0.1:3000 (`PORT`, `HOST`, `BASE_PATH` facultatifs)
- `npm run dev` : même serveur, redémarré à chaque modification
- `npm run build` : régénère `public/sw.js` (à lancer après toute modification de `public/`)
- `npm test` : tests Node (`tests/*.test.js`, sans navigateur)
- `npm run test:e2e` : tests Playwright (`e2e/*.spec.js`), en Chromium sur écran ordinateur et en émulation mobile Pixel 7
- `npx playwright install chromium` : à faire une fois avant les tests e2e
- `npm run update:iata` : rafraîchit `public/data/iata.json` (Python requis)

## Règles

- Préserver le fonctionnement hors connexion, les favoris et les dernières recherches
  (clé `localStorage` `cdg-parking.preferences.v1:<chemin>`). Ne pas renommer cette clé
  sans migration.
- Conserver les 169 correspondances de `public/js/mappings.js`. Pas de suppression ni de
  modification sans une source.
- Toute nouvelle information aéroportuaire (porte, parking, terminal, accès) doit citer
  sa source.
- Dans les documents, commits et réponses, distinguer clairement les **hypothèses**, les
  **informations vérifiées** (avec leur source) et la **date de publication** de chaque source.
- L'émulation mobile Playwright n'est pas un appareil réel : la présenter comme telle.
- Ne rien pousser sur GitHub ni déployer sans demande explicite (la fusion dans `main`
  déclenche la publication GitHub Pages).
