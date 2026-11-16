# Pilote 2B : bilan

Lot préparé les 14 et 15 novembre 2026 sur la branche `labo-claude`. L'application n'a pas été modifiée : les 169 correspondances de `public/js/mappings.js` sont intactes, et aucune ne concerne 2B.

## Résultat en une phrase

Le lot établit un échantillon de 20 lieux sourcés, mais **aucune correspondance poste → porte**, faute de source publique qui en énonce une.

## Informations vérifiées (avec source et date)

**Postes avion**
- 21 postes B existent : B01 à B16, B18, B20, B22, B24, B26.
- Leurs coordonnées INS sont dans l'eAIP AD 2 LFPG, AD 2.8 item 5, page datée 01 OCT 2026, cycle AIRAC 11/26 valable jusqu'au 25/11/2026 (S1).
- Ces libellés figurent sur la carte APDC 01 du 01 OCT 2026 (S2), sous la légende « POSTES DE STATIONNEMENT ».

**Portes d'embarquement**
- Le plan Paris Aéroport (S3, non daté) rattache à « Terminal 2B » les portes suivantes :
  - B10 à B12, au niveau 0 ;
  - B20 à B31, au niveau 1 ;
  - **D40 et D41**, au niveau 1.
- Ont été revérifiées : B10, B20, B21, B24, B26, B31, D40 et D41.

**Rattachement des postes pairs au bâtiment 2B (déduction cartographique)**
- Sur APDC 01 (S2), les postes pairs B02 à B26 font face au bâtiment étiqueté « B ».
- Sur GMC 03 (S2b, 11 JUN 2026), le même bâtiment est nommé « TERMINAL 2B ». Repères communs aux deux cartes : la voie G3 longe le bâtiment, et la voie TB2 sépare les bâtiments B et D.
- Il s'agit d'une **déduction cartographique**, pas d'un énoncé de source.

**Autres repères**
- HS A et HS B sont des points chauds (traversées de véhicules), d'après la légende d'APDC 01 et l'eAIP § 20.3.3.2.4.4.
- B1 et B2 sont dans l'encart de l'aire Hotel, hors 2B.

**Renommage annoncé**
- Au 16 mars 2027, 2B et 2D deviendraient le « Terminal 4 ». Sources : Air France (S4, métadonnée lastPublished 06/10/2026) et Connexion France (S5, 09/10/2026).
- Les portes M deviendraient des portes « B » (S4).

## Hypothèses (non étayées)

- **H1** : les postes pairs B02 à B26 sont desservis par les portes B20 à B31 et D40/D41.
  - Seuls appuis : la position des postes et des portes sur les plans.
- **H2** : les postes impairs B01 à B15, au nord de la voie G3, sont des postes éloignés desservis par les portes B10 à B12 du niveau 0.
  - Aucune source ne le dit, et leur terminal reste inconnu.

## Relation rejetée

**R1 : « poste Bnn = porte Bnn »**
- Aucune source ne l'énonce.
- Les numéros semblent croître en sens inverse : le poste B26 est à l'ouest et la porte B20 aussi.
- Le libellé « B » change de sens en 2027 : les portes M deviennent des portes B.

La convention F21 → F21 confirmée par Theo pour 2F ne se transpose pas à 2B.

## Contradictions

1. **Liste des portes de 2B**
   - Plan ADP : B10 à B12 et B20 à B31, plus D40 et D41.
   - Sources tierces non lues : « B21 to B34 » (flightqueue), « B22 à B33 » (guide RATP).
2. **Pré-passerelles 2B** : 13 annoncées par la recherche, 11 vérifiées. Le balayage n'a couvert que 95 des 470 fiches.
3. **Lettre D en 2B** : les portes D40 et D41 sont rattachées à 2B par leur fiche. La lettre de la porte ne suffit donc pas à déduire le terminal.
4. **Erreurs de la première extraction de texte (corrigées)**
   - Fausse proximité entre HS et le poste B13, et entre B1 et « Traversée véhicules ».
   - Mauvais placement de B1 et B2.
   - Le rendu en image a corrigé ces trois points.

## Preuves manquantes

- Un document qui associe chaque poste B à une porte : tableau d'affectation ADP, plan d'assistance, consigne d'exploitation, document compagnie.
- Le type de chaque poste : au contact ou éloigné.
- Les postes desservis par D40 et D41.
- Une date de publication du plan Paris Aéroport.
- Les futures lettres des portes de 2B et 2D après le 16/03/2027, dans une source ADP.
- Une confirmation terrain par Theo ou un agent, au même titre que les neuf fiches F déjà confirmées.

## Ce qui a réellement été exécuté

**1. Sous-agent de recherche** (14/11)
- Ouverture de l'eAIP (HTML, PDF, cartes APDC et ADC) et du plan Paris Aéroport dans le navigateur intégré : environ 325 lectures de l'API POI, espacées.
- Lecture des pages Air France et Connexion France, et recherches web.
- Téléchargements dans le dossier temporaire de session.
- Extraction du texte avec pdftotext.

**2. Agent principal**
- Recalcul des coordonnées décimales et des distances.
- Comparaison SHA-1 d'APDC 01 avec la copie du DVD eAIP fournie par Theo.
- Extraction du texte des cartes ADC 02, AMG 01 et GMC 01 à 08 de cette copie : découverte de GMC 03.
- Rendu en image d'APDC 01 et de GMC 03 avec pdftoppm (Calibre), puis lecture visuelle.

**3. Sous-agent de vérification**
- Le 14/11, il a :
  - retéléchargé l'eAIP et APDC 01 ;
  - relu 9 fiches POI ADP et `POIs.json` ;
  - relu les pages Air France et Connexion France ;
  - fait trois recherches web.
- Il a été interrompu à la fin de la session, puis relancé le 15/11 pour finir la vérification et examiner GMC 03.
- Pendant ce travail :
  - une navigation vers un PDF a fait apparaître une boîte d'enregistrement chez Theo, sans téléchargement ;
  - un appel suivant à l'API ADP a été refusé, et le balayage s'est arrêté là ;
  - la page produit du SIA n'a pas pu être rouverte.
- Il a relevé 3 écarts dans le brouillon (HS, B1/B2, bâtiment « B »), tous corrigés dans les trois fichiers.

**4. Organisation des écritures**
- Les deux sous-agents n'ont rien écrit dans le dépôt.
- Seul l'agent principal a écrit les quatre livrables.
- Rien n'a été poussé ni déployé.

## Prochaine petite tâche recommandée

Faire confirmer sur le terrain 3 postes pairs, B20, B24 et B26 :
- la porte réellement utilisée pour chacun ;
- s'ils sont au contact ou éloignés.

Même méthode que pour les neuf fiches F.

Ces trois postes sont choisis parce que leur numéro est aussi un numéro de porte : ils testent directement l'hypothèse R1, « poste Bnn = porte Bnn ».

Tant qu'il n'y a pas de confirmation, ne rien ajouter à `mappings.js`.

Avant toute intégration, il faut aussi prévoir le renommage du 16/03/2027.
