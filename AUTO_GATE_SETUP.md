# Mode Vraiment Auto (Porte ADP)

Cette version ajoute une API backend `/api/gate` qui interroge ADP automatiquement et renvoie la porte d'embarquement.

## Lancer en local

1. Installer Node.js 20+.
2. Installer les dépendances:
   - `npm install`
3. Installer le navigateur Playwright:
   - `npx playwright install chromium`
4. Démarrer l'app:
   - `npm run dev`
5. Ouvrir:
   - `http://localhost:3000`

## Variables utiles

- `PORT` (par défaut `3000`)
- `ALLOWED_ORIGIN` (par défaut `*`)
- `GATE_CACHE_TTL_MS` (par défaut `90000`)

## Frontend

Au scan:
1. Le vol est détecté.
2. L'app appelle automatiquement `/api/gate?flight=AFxxxx`.
3. La porte est affichée dans le popup.
4. Le bouton ADP reste disponible en secours.

## Vérification rapide API

Testez directement dans le navigateur:
- `http://localhost:3000/api/gate?flight=AF7434`

Vous devez obtenir du JSON avec `found: true` et `gate` si ADP est bien extrait.

## Remarque

ADP peut changer son HTML / ses flux et casser ponctuellement l'extraction. Le backend est prévu avec fallback DOM + JSON, mais un ajustement peut être nécessaire si ADP modifie son site.