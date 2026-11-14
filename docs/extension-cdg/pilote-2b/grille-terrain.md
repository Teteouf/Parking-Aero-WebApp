# Pilote 2B : grille de confirmation terrain

Cette grille sert à faire confirmer par un agent de terrain trois postes avion du terminal 2B : **B20, B24 et B26**. Il y a une fiche par poste, à imprimer ou à remplir à l'écran.

Les réponses se reportent ensuite dans [`confirmations-terrain.json`](confirmations-terrain.json). Rien ne doit entrer dans `public/js/mappings.js` tant que la porte n'est pas confirmée.

## Mode d'emploi

### Statut de chaque champ (une seule case)

| Statut | Quand l'utiliser |
|---|---|
| ☐ **À confirmer** | Valeur par défaut. Pas encore de réponse, ou une réponse non vérifiée. |
| ☐ **Confirmé** | L'agent a vu ou sait de façon sûre. Il faut noter la valeur. |
| ☐ **Variable selon conditions** | La réponse change. Il faut noter de quoi elle dépend (compagnie, Schengen ou non, type d'avion, période…) et la valeur dans chaque cas. |
| ☐ **Inconnu** | L'agent ne sait pas. Ce n'est pas la même chose que « à confirmer » : la question a été posée, sans réponse. |

### Nature de l'information (pour tout champ « Confirmé » ou « Variable »)

- ☐ **Observation ponctuelle** : vue une fois, sur un vol précis. Il faut noter la date, l'heure et si possible le vol.
- ☐ **Correspondance habituelle** : c'est le fonctionnement normal, selon l'expérience de l'agent ou un document.

**Une observation ponctuelle ne suffit pas, seule, à établir une correspondance habituelle.**

### Origine (pour chaque champ renseigné)

- ☐ Vu directement par l'agent
- ☐ Document interne : nom, date, citable oui/non
- ☐ Information transmise par un collègue : fonction
- ☐ Signalétique sur place : panneau, marquage au sol

Pour chaque champ, notez aussi la **date de la confirmation** et la **fonction de l'agent**. Le nom de l'agent n'est pas demandé.

> Pas de photo en zone réservée sans autorisation.

---

## Fiche 1 : poste B20

**Ce que disent les sources publiques** (voir [`observations.json`](observations.json))
- Le poste B20 existe dans l'eAIP (point INS 49°00'18.29"N 002°33'37.48"E, page du 01 OCT 2026).
- Sur la carte APDC 01, il fait face au bâtiment « B ».
- Une **porte** B20 existe aussi en 2B, au niveau 1. Elle est à environ 88 m du point du poste.
- **Rien ne prouve que le poste B20 utilise la porte B20.**

Date de l'entretien : ____ /____ /______  Fonction de l'agent : ______________________

| # | Question | Réponse | Statut | Nature | Origine | Date |
|---|---|---|---|---|---|---|
| 1.1 | Libellé exact du poste au sol ou sur le panneau | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 1.2 | Terminal et bâtiment (2B ?) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 2.1 | Le poste a-t-il une passerelle ? Combien ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 2.2 | Sinon, passage en bus ou à pied ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.1 | **Porte utilisée pour l'embarquement** | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.2 | Porte utilisée pour le débarquement, si différente | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.3 | Si la porte varie : de quoi cela dépend-il, et quelle porte dans chaque cas ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.4 | La porte affichée aux passagers est-elle la porte physique utilisée ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 4.1 | Le poste est-il une variante d'un autre poste, qu'on ne peut pas occuper en même temps ? Lequel ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.1 | Section ou lettre de zone | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.2 | Hors terminal ? (oui/non) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.3 | Rampe nécessaire ? (oui/non) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.4 | Ascenseur nécessaire ? (oui/non) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 6.1 | Futur nom de la porte au passage au Terminal 4 (annoncé pour le 16/03/2027) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 7.1 | Remarques libres de l'agent | | — | — | | |

---

## Fiche 2 : poste B24

**Ce que disent les sources publiques**
- Le poste B24 existe dans l'eAIP (point INS 49°00'16.61"N 002°33'34.55"E, page du 01 OCT 2026).
- Sur la carte APDC 01, il fait face au bâtiment « B ».
- Son point est à environ **12 m** de celui du poste B26 : ce sont peut-être des postes qui se chevauchent (hypothèse).
- Une **porte** B24 existe aussi en 2B, au niveau 1.
- **Rien ne prouve que le poste B24 utilise la porte B24.**

Date de l'entretien : ____ /____ /______  Fonction de l'agent : ______________________

| # | Question | Réponse | Statut | Nature | Origine | Date |
|---|---|---|---|---|---|---|
| 1.1 | Libellé exact du poste au sol ou sur le panneau | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 1.2 | Terminal et bâtiment (2B ?) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 2.1 | Le poste a-t-il une passerelle ? Combien ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 2.2 | Sinon, passage en bus ou à pied ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.1 | **Porte utilisée pour l'embarquement** | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.2 | Porte utilisée pour le débarquement, si différente | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.3 | Si la porte varie : de quoi cela dépend-il, et quelle porte dans chaque cas ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.4 | La porte affichée aux passagers est-elle la porte physique utilisée ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 4.1 | **B24 et B26 peuvent-ils être occupés en même temps ? Ont-ils la même porte ?** | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.1 | Section ou lettre de zone | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.2 | Hors terminal ? (oui/non) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.3 | Rampe nécessaire ? (oui/non) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.4 | Ascenseur nécessaire ? (oui/non) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 6.1 | Futur nom de la porte au passage au Terminal 4 (annoncé pour le 16/03/2027) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 7.1 | Remarques libres de l'agent | | — | — | | |

---

## Fiche 3 : poste B26

**Ce que disent les sources publiques**
- Le poste B26 existe dans l'eAIP (point INS 49°00'16.99"N 002°33'34.43"E, page du 01 OCT 2026).
- C'est le poste B le plus à l'ouest de la rangée qui fait face au bâtiment « B » sur la carte APDC 01.
- Son point est à environ **12 m** de celui du poste B24.
- Une **porte** B26 existe aussi en 2B, au niveau 1. Elle est située plus à l'est que la porte B20, alors que le poste B26 est à l'ouest du poste B20.
- **Rien ne prouve que le poste B26 utilise la porte B26.**

Date de l'entretien : ____ /____ /______  Fonction de l'agent : ______________________

| # | Question | Réponse | Statut | Nature | Origine | Date |
|---|---|---|---|---|---|---|
| 1.1 | Libellé exact du poste au sol ou sur le panneau | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 1.2 | Terminal et bâtiment (2B ?) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 2.1 | Le poste a-t-il une passerelle ? Combien ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 2.2 | Sinon, passage en bus ou à pied ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.1 | **Porte utilisée pour l'embarquement** | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.2 | Porte utilisée pour le débarquement, si différente | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.3 | Si la porte varie : de quoi cela dépend-il, et quelle porte dans chaque cas ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 3.4 | La porte affichée aux passagers est-elle la porte physique utilisée ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | ☐ Ponct. ☐ Hab. | | |
| 4.1 | **B26 et B24 peuvent-ils être occupés en même temps ? Ont-ils la même porte ?** | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.1 | Section ou lettre de zone | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.2 | Hors terminal ? (oui/non) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.3 | Rampe nécessaire ? (oui/non) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 5.4 | Ascenseur nécessaire ? (oui/non) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 6.1 | Futur nom de la porte au passage au Terminal 4 (annoncé pour le 16/03/2027) | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | — | | |
| 7.1 | Remarques libres de l'agent | | — | — | | |

---

## Questions communes (à poser une fois, hors fiches)

| # | Question | Réponse | Statut | Origine | Date |
|---|---|---|---|---|---|
| C.1 | Quels postes desservent les portes D40 et D41, que le plan d'ADP place en 2B ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | | |
| C.2 | Les portes B10 à B12 (niveau 0) sont-elles des portes vers bus ? Vers quels postes ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | | |
| C.3 | Les « pré-passerelles » ont-elles un numéro sur place ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | | |
| C.4 | Existe-t-il un document interne qui associe postes et portes ? Nom, date, citable oui/non ? | | ☐ À conf. ☐ Conf. ☐ Var. ☐ Inc. | | |

## Règle d'intégration (rappel)

Une relation poste → porte peut passer dans `relations_etayees` de [`relations-candidates.json`](relations-candidates.json) quand **les trois conditions** sont réunies :
- la question 3.1 est « Confirmé » ;
- la nature est « Correspondance habituelle » ;
- l'origine et la date sont renseignées.

Une réponse « Variable selon conditions » doit être intégrée avec ses conditions, jamais réduite à une seule porte.

L'ajout à `public/js/mappings.js` reste une étape séparée, sur demande explicite.
