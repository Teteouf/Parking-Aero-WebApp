# CDG Parking

Antisèche mobile parking ↔ porte, avec détails de terminal, porte, rampe,
ascenseur et emplacement au large. Un second onglet recherche les codes IATA
des aéroports et villes. Le scanner, les données passager, l’API ADP,
Playwright, les scripts externes et les animations de l’ancienne version ont
été retirés.

## Démarrer et vérifier

Node.js 20 ou plus suffit. Aucune dépendance npm et aucune installation de
navigateur ne sont nécessaires.

```sh
npm start
npm test
```

Ouvrir http://localhost:3000. `npm run dev` surveille le serveur Node.
Variables facultatives : `PORT` et `HOST` (par défaut 3000 et 127.0.0.1).
Le serveur ne publie que `public/`, jamais le code de `src/`.

Pour reproduire le chemin GitHub Pages en local dans PowerShell :

```powershell
$env:BASE_PATH = '/Parking-Aero-WebApp/'
npm start
```

Ouvrir http://localhost:3000/Parking-Aero-WebApp/. Sans `BASE_PATH`, le serveur
continue à servir l’application à la racine. `npm test` vérifie les deux
emplacements, les ressources et le cache hors connexion sous le chemin Pages.

## Publier le site

Le workflow `.github/workflows/pages.yml` construit et vérifie l’application
sur les pull requests, puis publie uniquement `public/` après une fusion dans
`main`. Configurer GitHub Pages avec la source **GitHub Actions**.
La procédure de première migration est dans [docs/publication-github.md](docs/publication-github.md).
Avant chaque déploiement, le workflow vérifie que la source Pages est bien
GitHub Actions et qu’aucun ancien déploiement Jekyll n’est encore en attente
ou en cours. Sinon, il s’arrête avec les instructions de correction.

Après chaque modification de fichier public, exécuter `npm run build`.
Publier **le contenu de `public/`** sur un hébergement statique HTTPS, au même
emplacement que l’ancien site pour conserver les raccourcis des agents.
Les chemins relatifs fonctionnent aussi dans un sous-dossier.
Servir `sw.js` sans cache HTTP durable (`Cache-Control: no-cache`) et avec
un type JavaScript. Servir le manifeste avec
`application/manifest+json`. Le serveur local fournit déjà ces en-têtes.

La nouvelle application est entièrement statique : aucun serveur d’extraction
ADP, compte, API distante ni base de données n’est nécessaire en production.

## Ouverture rapide et hors connexion

Les correspondances parking/porte sont incluses dans un petit fichier local et
la recherche est immédiate, sans appel réseau. À la première visite en ligne,
le service worker enregistre l’interface, les ressources et tout le répertoire
IATA. Attendre **« Disponible hors connexion »** avant de fermer cette première
visite. Les ouvertures suivantes utilisent les fichiers enregistrés en priorité,
sans attendre le réseau ; cela continue à fonctionner au-delà de la journée.

Le mode hors connexion exige HTTPS (ou localhost pendant le développement).
Un service worker ne s’installe pas en ouvrant directement un fichier `file://`.
L’appareil peut supprimer les données du site en cas de manque d’espace,
effacement manuel ou navigation privée : une nouvelle visite en ligne sera alors
nécessaire. La recherche IATA charge uniquement le fichier local déjà enregistré.

Sur Safari : Partager → Sur l’écran d’accueil.
Sur Chrome Android : menu → Installer l’application / Ajouter à l’écran d’accueil.

L’icône d’installation reprend le visuel avion + repère « CDG » fourni par Theo.
Les fichiers Apple de 152, 167 et 180 pixels couvrent iPad et iPhone ; les icônes
standard de 192 et 512 pixels servent aux autres navigateurs. Android dispose
en plus de variantes `maskable`, avec un fond opaque et une composition protégée
dans la zone centrale pour les découpes rondes et arrondies. Tous ces fichiers
sont stockés hors connexion. Le système et le thème du téléphone choisissent la
forme finale ; les aperçus de `docs/preview-home-icons.png` sont des simulations,
pas des captures de téléphones physiques.

Les noms de fichiers `v2` évitent de réutiliser les anciennes images du cache.
Après publication, si un raccourci installé conserve une ancienne icône,
supprimer uniquement ce raccourci puis l’ajouter de nouveau depuis le site à jour.
Les sources sont conservées dans `resources/`. Pour réexporter les formats sur
Windows, exécuter `powershell -NoProfile -File scripts/build-icons.ps1`, puis
`npm run build`. L’application publiée n’a aucune dépendance à PowerShell.

Le bouton QR code en haut à droite ouvre le partage de l’application et les
instructions d’installation. L’image `public/assets/qr-cdg-parking.png` est
l’original créé par Theo, récupéré à l’identique depuis l’archive de la première
version : aucun nouveau QR n’est généré et aucun service externe n’est utilisé
pour l’afficher. L’image est enregistrée avec l’application pour pouvoir la
montrer hors connexion.
Le QR pointe vers `https://teteouf.github.io/Parking-Aero-WebApp/`, avec son
fragment original conservé dans l’image. Le bouton de copie reprend cette même
adresse publique, sans le fragment ; il ne partage pas localhost.
Publier les nouvelles versions à cette adresse conserve donc le QR existant.

Une nouvelle version est téléchargée en arrière-plan. Le bouton
**« Nouvelle version · Actualiser »** permet de l’activer. Une mise à jour
incomplète conserve la version précédente, et un changement de contenu produit
automatiquement un nouveau numéro de cache avec `npm run build`.

## Organisation

- `public/` : uniquement les fichiers servis aux agents.
- `public/js/mappings.js` : les 169 correspondances de la version originale,
  conservées sans modification de leurs valeurs.
- `public/js/core.js` : recherche et normalisation, sans dépendance au navigateur.
- `public/js/app.js` : interface, détails, onglets et installation.
- `public/js/theme.js` : choix jour / nuit, restauré avant l’affichage.
- `public/js/preferences.js` : favoris et dernières recherches sur cet appareil.
- `public/css/app.css` : styles adaptés au smartphone.
- `public/data/iata.json` : copie locale du répertoire d’aéroports et villes.
- `src/server.js` : petit serveur statique local, sans dépendance.
- `src/service-worker.js` : modèle du service worker.
- `scripts/build-cache.js` : génération de `public/sw.js` avec empreinte du contenu.
- `scripts/update-iata.py` : mise à jour des données, uniquement lors de la maintenance.
- `tests/` : recherche, conservation des correspondances, serveur et fonctionnement hors connexion.
- `.github/workflows/pages.yml` : vérifications et publication du dossier public.

La recherche accepte `E22`, `K43`, `E 22` et les codes sans zéro initial comme
`F3`. Une correspondance exacte prime sur les résultats partiels. Les résultats
portent toujours les labels Parking / Porte pour éviter les ambiguïtés.

## Interface compacte et mode jour / nuit

Le bouton soleil / lune en haut à droite, à côté du QR code, bascule immédiatement
entre les deux apparences. À la première visite, l’application suit le réglage
du téléphone. Un choix manuel est conservé sur cet appareil et reprend à la
prochaine ouverture, y compris hors connexion. Le thème est restauré avant
l’affichage de l’interface pour éviter un passage par un écran clair. Si le
stockage est bloqué, le bouton fonctionne pour la session.

Le QR original conserve son fond blanc dans les deux modes. Les fenêtres de
détails, les codes IATA, les favoris et les contrôles suivent le thème choisi.
Les filtres 2E, 2F et 2G restent directement accessibles ; « Plus » affiche
Terminal 1 et Rampe / ascenseur. Lorsqu’un de ces filtres est actif, son nom
reste indiqué à côté du nombre de résultats, même si la section est refermée.
Les sections de favoris et d’historique apparaissent lorsqu’elles contiennent
des éléments, pour garder l’écran compact.

## Favoris et dernières recherches

L’étoile d’une correspondance ou d’un code IATA permet de l’ajouter aux favoris.
La fiche détaillée d’un parking propose aussi ce bouton. Les favoris apparaissent
dès l’ouverture, lorsque le champ de recherche est vide. Un favori parking ouvre
directement sa fiche ; un favori IATA affiche les informations de ce code.
La croix du raccourci ou l’étoile de la fiche permet de retirer un favori.

Les dix dernières recherches utiles sont conservées, sans doublons : les codes
reconnus après une pause de saisie, et les recherches avec résultats validées
avec Entrée, en quittant le champ ou en ouvrant un résultat. Les saisies vides,
sans résultat et les préfixes intermédiaires ne remplissent pas l’historique.
Un raccourci relance la recherche dans le bon onglet et réinitialise les filtres
de terminal pour éviter de masquer son résultat. « Effacer l’historique » laisse
les favoris intacts. Jusqu’à 50 favoris peuvent être conservés.

Ces informations restent dans le stockage local du navigateur, séparées par
emplacement du site. Elles fonctionnent hors connexion et survivent aux mises
à jour de l’application. Elles ne sont pas envoyées à un serveur ni synchronisées
entre téléphones. Si le stockage est indisponible, la recherche reste utilisable
et les favoris sont conservés pour la session, avec une indication explicite.

## Données IATA

Aéroports : [OurAirports](https://ourairports.com/data/), données du domaine public.
Le nom de l’aéroport et les codes ICAO proviennent de cette source.
Villes, noms français et rattachements aux zones métropolitaines : données de
référence publiques de Travelpayouts
([villes](https://api.travelpayouts.com/data/fr/cities.json),
[rattachements](https://api.travelpayouts.com/data/fr/airports.json)).
Les aéroports fermés restent identifiables et sont explicitement marqués.
Les éventuels codes dupliqués dans les sources ne sont pas arbitrairement écrasés.

Le fichier contient tous les codes à trois lettres valides des sources retenues,
avec les villes sans entrée aéroport correspondante. Il ne remplace pas le
[référentiel officiel exhaustif IATA](https://www.iata.org/en/publications/manuals/airline-airport-location-coding-databases/),
disponible sous abonnement. La date, les sources et la couverture sont conservées
dans le fichier, et la date est consultable dans l’application.

Pour actualiser la copie, avec Python 3 et une connexion Internet :

```sh
npm run update:iata
npm test
```

Les téléchargements ont lieu à la maintenance seulement. La copie existante est
remplacée après validation complète, puis le service worker est régénéré.
Les appareils recevront les nouvelles données à leur prochaine mise à jour en ligne.
Les correspondances CDG restent mises à jour manuellement dans `mappings.js` ;
elles ne sont jamais écrasées par l’import IATA.
