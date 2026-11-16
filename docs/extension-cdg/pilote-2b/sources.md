# Pilote 2B : sources

Dates de consultation : **2026-11-14** pour la recherche, **2026-11-15** pour la vérification indépendante et pour la carte GMC 03.
Aucune de ces sources n'a été intégrée à l'application.

Conventions :
- **Vérifié** : lu directement dans la source pendant ce lot.
- **Non lu** : vu seulement dans un résultat de recherche.
- **Hypothèse** : déduction qu'aucune source n'énonce.

## S1. eAIP France, AD 2 LFPG (texte)

| Champ | Valeur |
|---|---|
| Éditeur | SIA (DGAC), diffusion libre |
| Point d'entrée | https://www.sia.aviation-civile.gouv.fr/produits-numeriques-en-libre-disposition/eaip.html |
| HTML | https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_29_OCT_2026/FRANCE/AIRAC-2026-10-29/html/eAIP/FR-AD-2.LFPG-fr-FR.html |
| PDF | https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_29_OCT_2026/FRANCE/AIRAC-2026-10-29/pdf/FR-AD-2.LFPG-fr-FR.pdf |
| Cycle | AIRAC 11/26, en vigueur du 29/10/2026 au 25/11/2026. Lu sur la page produit SIA par le sous-agent de recherche ; le vérificateur n'a pas pu rouvrir cette page, mais le calcul AIRAC et le chemin `AIRAC-2026-10-29` concordent. |
| Date des pages utiles | AD 2.8 (page PDF 4) datée « 01 OCT 2026 », amendement A-2026-10 |
| Contenu utile | AD 2.8, item 5, « Points de vérification INS » : 21 identifiants B01 à B26 avec coordonnées. AD 2.18 : 121.640 MHz « Au profit des postes de stationnement B et D ». Gestion d'aire de trafic : « Vigie Trafic CDG2 ». |

**Limites :**
- Le tableau liste des points INS par poste. Il ne nomme ni terminal ni porte.
- Le cycle expire le 25/11/2026 : les données sont à revérifier au cycle suivant.

## S2. eAIP, carte AD 2 LFPG APDC 01

| Champ | Valeur |
|---|---|
| Titre | « AIRES DE STATIONNEMENT / Parking areas – ALPHA - BRAVO - CHARLIE - DELTA - ECHO - FOX - GOLF - HOTEL » |
| URL | https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_29_OCT_2026/FRANCE/AIRAC-2026-10-29/html/eAIP/Cartes/LFPG/AD_2_LFPG_APDC_01.pdf |
| Date de la carte | « 01 OCT 2026 » ; « AMDT 10/26 CHG : suppression postes E40 et E42 » |
| SHA-1 | `09b8d87c96c716cb7c7a1a67e6e3593fc036b3df`, identique pour la version en ligne et pour la copie du DVD fournie par Theo |
| Contenu utile (lecture visuelle) | Postes B01 à B26 avec leurs flèches « Position INS ». Bâtiment étiqueté « B » sous la mention « TERMINAL 2 ». Postes pairs B02 à B26 devant la façade du bâtiment B ; postes impairs B01 à B15 sur un îlot au nord de la voie G3. La voie TB2 sépare les bâtiments B et D. « HS A » et « HS B » sont des points chauds selon la légende. « B1 » et « B2 » sont dans l'encart « AIRE HOTEL », hors 2B. |

**Limites :**
- La carte n'écrit pas « 2B » : elle écrit « B » dans « TERMINAL 2 ».
- Elle ne porte aucune porte d'embarquement.
- La première extraction de texte avait mal placé B1, B2 et HS. Les positions ci-dessus viennent d'un rendu en image (pdftoppm de Calibre), vu par le vérificateur et par l'agent principal.
- Les cartes APDC 02 à 05, ADC 01 et 02 et AMG 01 n'apportent rien pour 2B.

## S2b. eAIP, carte AD 2 LFPG GMC 03

| Champ | Valeur |
|---|---|
| Titre | « MOUVEMENTS A LA SURFACE / Ground movements – TERMINAL 2 et/and TERMINAL 3 » |
| Fichier | `FRANCE/AIRAC-2026-10-29/html/eAIP/Cartes/LFPG/AD_2_LFPG_GMC_03.pdf`, dans la copie du DVD eAIP fournie par Theo (`eaip_29_oct_2026.zip`). Même chemin attendu en ligne sous `…/media/dvd/eAIP_29_OCT_2026/` (non vérifié). |
| Date | « 11 JUN 2026 » ; « AMDT 06/26 CHG : Configuration voie A4 » |
| SHA-1 (copie locale) | `af6968aaf999bf0bbe8ae65136982b33585c316e` |
| Contenu utile | Seule carte eAIP consultée qui écrit « TERMINAL 2B ». Elle nomme ainsi le bâtiment longé par la voie G3, avec « TERMINAL 2D » de l'autre côté de la voie TB2. Le nord est à gauche. |

**Limites :**
- Aucun poste ni aucune porte n'y figure.
- Combinée avec S2, elle permet seulement une **déduction cartographique** : le bâtiment « B » d'APDC 01 est le terminal 2B.

## S3. Plan interactif Paris Aéroport (Groupe ADP)

| Champ | Valeur |
|---|---|
| Page | https://www.parisaeroport.fr/planpoi/plan.html?terminal=2B&level=1 (départ : `terminal=2A&level=1`) |
| Données | `…/planpoi/cartePOI/POI/json/POIs.json` (id, niveau, X/Y Web Mercator) ; `…/cartePOI/maps.json` ; `…/cartePOI/POI/json/2ABCD/levels.json` ; `…/2ABCD/{niveau}/structurePOI.json` |
| Libellés | API `https://www.parisaeroport.fr/api/POI/{id}?lang=fr` (fiche HTML), par exemple « PORTE B20 – Portes d'embarquement – Paris-Charles De Gaulle Terminal 2B – Zone réservée » |
| Date de publication | **non indiquée** |
| Contenu utile | Portes B10 à B12 (niveau 0) et B20 à B31 (niveau 1). Portes D40 et D41 (niveau 1), dont la fiche indique « Terminal 2B ». « Pré-passerelle » sans numéro marquées « Terminal 2B » : 11 vérifiées, 13 annoncées lors de la recherche. |
| Vérification | Le vérificateur a relu les fiches 10262, 10243, 10244, 10247, 10249, 10254, 10255, 10256 et 11112, ainsi que leurs coordonnées dans `POIs.json`. Les autres portes (B11, B12, B22, B23, B25, B27 à B30) n'ont pas été relues. |

**Limites :**
- Aucune donnée sur les postes avion.
- Données non datées, sans version.
- Les coordonnées sont celles d'une icône sur un plan, pas celles d'un point d'embarquement levé.

## S4. Air France, changement des noms des terminaux et des portes

| Champ | Valeur |
|---|---|
| URL | https://wwws.airfrance.fr/information/aeroport/changement-noms-terminaux-cdg |
| Date de publication | Non affichée sur la page. Les métadonnées de la version australienne contiennent `"lastPublished":"2026/10/06 11:15:52"`. **Date d'effet annoncée : 16 mars 2027.** |
| Contenu utile | Version française : « À compter du 16 mars 2027 » et « Les portes M deviennent les portes B ». FAQ de la version australienne (wwws.airfrance.com.au, en anglais) : « Terminals 2B and 2D will become Terminal 4 ». |

**Limites :**
- Source compagnie, pas ADP.
- La page ne donne pas les futures lettres des portes de 2B et 2D.
- La version française redirige vers une version régionale : chaque citation est rattachée à sa version.

## S5. Sources secondaires (non officielles)

| Source | Date | Statut | Apport |
|---|---|---|---|
| Connexion France, https://www.connexionfrance.com/transportation/paris-charles-de-gaulle-airport-to-rename-terminals/820088 | publié le 09/10/2026, modifié le 19/10/2026 | lu | Confirme que 2B et 2D deviennent Terminal 4 au 16/03/2027 |
| cdgfacile.com/terminal-2b-aeroport-roissy-cdg | non indiquée | lu | Site qui se dit « non officiel » : selon lui, 2B partage avec 2D l'accès aux zones d'embarquement |
| flightqueue.com | — | **non lu** (403) | Extrait de recherche : « B21 to B34 » |
| Guide RATP | — | **non lu** | Extrait de recherche : « Portes B22 à B33 » |
| TravelExtra | — | **non lu** | Extrait de recherche : lettres G/H pour le futur Terminal 4 |
| Grand Roissy Tourisme | juin 2021 | **non lu** (404) | Réouverture de 2B en juin ou juillet 2021 selon les extraits |

Ces sources ne servent qu'à repérer des contradictions. Aucune observation ne repose sur elles seules.

## Copies locales (hors dépôt, dans le dossier temporaire de la session)

Les fichiers téléchargés, le texte extrait et les rendus en image sont restés dans le dossier temporaire de la session Claude. Ils ne sont pas versionnés et peuvent disparaître.

Pour reproduire le lot :
- retélécharger S1 et S2 depuis les URL ci-dessus ;
- ou utiliser la copie du DVD eAIP fournie par Theo, hors dépôt : `D:\Users\Theo\Téléchargement\parking correspondance\` (cycle AIRAC 2026-10-29).

Aucun fichier de ce DVD n'a été exécuté.

## Sources cherchées mais non trouvées

- Un document public d'ADP ou d'un assistant au sol qui associe chaque poste à une porte.
- Un communiqué officiel d'ADP sur la numérotation des portes de 2B.
- Un NOTAM ou un SUP AIP propre à 2B.
