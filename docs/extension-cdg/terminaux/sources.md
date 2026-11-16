# Extension 2A à 2D : sources

Dates de consultation : 2026-11-14 (pilote 2B) et 2026-11-15 (extension).
Ce dossier reprend le travail de [`../pilote-2b/`](../pilote-2b/).

## Sources utilisées

| Id | Source | Date de publication ou d'effet | Ce qu'elle apporte | Limites |
|---|---|---|---|---|
| S1 | eAIP France, AD 2 LFPG, AD 2.8 item 5 « Points de vérification INS ». Copie du DVD AIRAC 2026-10-29 fournie par Theo, `FRANCE/AIRAC-2026-10-29/pdf/FR-AD-2.LFPG-fr-FR.pdf` | Page du 01 OCT 2026 ; cycle AIRAC 11/26, du 29/10/2026 au 25/11/2026 | Liste et coordonnées des postes avion : 18 postes A, 21 postes B, 14 postes C, 20 postes D | Ne cite aucun terminal ni aucune porte. À revérifier au cycle suivant. |
| S2 | eAIP, carte AD 2 LFPG APDC 01 « Aires de stationnement » (même copie) | 01 OCT 2026, AMDT 10/26 | Position de chaque poste ; flèches « Position INS » ; bâtiments étiquetés A, B, C et D dans « TERMINAL 2 » | N'écrit ni « 2A », ni « 2B », ni « 2C », ni « 2D ». Aucune porte n'y figure. Lecture visuelle d'un rendu à 300 dpi. |
| S2b | eAIP, carte AD 2 LFPG GMC 03 « Mouvements à la surface » (même copie) | 11 JUN 2026, AMDT 06/26 | Nomme « TERMINAL 2B » et « TERMINAL 2D » | Ne couvre pas les bâtiments A et C. Aucun poste ni aucune porte n'y figure. |
| S1-txt | eAIP, AD 2 LFPG, texte AD 2.20 (même copie) | Page du 19 FEB 2026 | Associe les postes CFW et CFE à « l'aire CHARLIE » | Ne nomme pas de terminal. |
| S3 | Plan interactif Paris Aéroport (Groupe ADP), https://www.parisaeroport.fr/planpoi/plan.html?terminal=2A&level=1 ; fichiers `POIs.json` et `pictosNOPOI.json` du plan 2ABCD ; fiches `/api/POI/{id}?lang=fr` | **Non datée.** Consultée le 2026-11-15 | 60 portes d'embarquement, chacune avec son terminal (« Terminal 2A » à « 2D »), son niveau et sa position | Ne cite aucun poste avion. Extraction limitée aux points portant l'icône `241.png` : d'autres portes pourraient utiliser une autre icône. Les portes A46, D61, D64 et D65 n'ont pas été trouvées. |

## Sources cherchées sans résultat

- **Correspondance poste ↔ porte.** Aucune source publique consultée n'en énonce une. L'eAIP (AD 2.20.3.5) renvoie aux « consignes particulières d'utilisation des postes de stationnement », disponibles auprès du gestionnaire sur https://espacepro.groupeadp.fr/. Cet espace professionnel n'a pas été consulté.
- **Mention « Terminal 2A » ou « Terminal 2C » dans l'eAIP.** Aucune des cartes LFPG de la copie n'écrit ces noms.

## Méthode de rattachement d'un poste à un terminal

- La première lettre du code n'est jamais utilisée seule.
- Un poste est rattaché à un terminal quand sa flèche, sur APDC 01, pointe vers la façade du bâtiment correspondant. C'est une **déduction cartographique**.
- Les autres postes du secteur sont marqués « Terminal non établi » : ceux de l'autre côté d'une voie, d'un îlot ou d'une aire isolée.
- Le détail, poste par poste, est dans [`donnees/rattachements.json`](donnees/rattachements.json).

## Données

- [`donnees/postes-eaip-ad2-8.json`](donnees/postes-eaip-ad2-8.json) : 73 postes A, B, C et D relevés dans S1.
- [`donnees/portes-plan-paris-aeroport.json`](donnees/portes-plan-paris-aeroport.json) : 60 portes relevées dans S3.
- [`donnees/rattachements.json`](donnees/rattachements.json) : rattachement de chaque poste, notes, relations étayées (aucune à ce jour).
- `scripts/build-extension-data.js` produit `public/js/extension-data.js`, le seul fichier de données que lit l'application, pour les terminaux déjà intégrés.
