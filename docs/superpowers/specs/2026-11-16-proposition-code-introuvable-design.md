# Proposer un parking ou une correspondance depuis une recherche sans résultat

Date : 2026-11-16 · Conception validée par Theo le 2026-11-16 (essai B, Superpowers 7.0.2).

## Intention

Quand un agent cherche un code qui n'existe pas dans l'application, il doit pouvoir
signaler ce code sans quitter le parcours. La proposition est un message préparé sur
l'appareil, relu avant toute mise à jour. Elle ne modifie aucune donnée publiée.

## Objectifs

- Afficher « Proposer un parking ou une correspondance » dans l'onglet **Parkings & portes**,
  uniquement pour une recherche non vide sans aucun résultat. Cela inclut le cas d'un terminal
  pas encore intégré. L'onglet IATA n'est pas concerné.
- Réutiliser le formulaire de contribution existant (`#contributionDialog`).
- Préremplir le code recherché (en majuscules), modifiable.
- Ne supposer aucune correspondance : la porte ou le parking associé est facultatif.
- Brouillon conservé après rechargement et hors connexion ; copie du message ou courriel préparé.
- Indiquer clairement que la proposition n'est pas encore transmise.

## Non-objectifs et anti-objectifs

- Aucun envoi automatique, aucun serveur.
- Aucune modification de `mappings.js`, `extension-data.js`, des favoris
  (`cdg-parking.preferences.v1:<chemin>`) ou de l'historique.
- Échec, même si la fonction marche : le message laisse croire qu'une correspondance est
  établie, ou qu'il a déjà été transmis.

## Approches envisagées

1. **Nouveau type `propose` dans le formulaire existant** (retenue). On ajoute deux champs
   (code proposé et nature du code), visibles uniquement pour ce type. Le brouillon, la
   validation accessible, la copie et le courriel existants sont réutilisés.
2. Un formulaire séparé. Écarté : la demande impose de réutiliser le formulaire existant, et
   cette approche dupliquerait la gestion du brouillon et des erreurs.

## Conception

- `contributions.js` :
  - type `propose` (titre « Proposer un parking ou une correspondance ») ;
  - champs ajoutés au brouillon : `proposedCode` et `codeType` (`stand`, `gate`, `unknown`) ;
  - `buildMessage('propose', …)` reprend la recherche effectuée, le code proposé, sa nature
    et la correspondance indiquée. Sans correspondance, le message porte « non indiquée
    (aucune n'est supposée) ».
- Formulaire :
  - « Code proposé » : obligatoire, motif `[A-Za-z0-9-]{1,12}` ;
  - « Ce code est… » : choix obligatoire entre Parking, Porte et Je ne sais pas ;
  - le champ réponse devient « Porte ou parking associé », facultatif.
- Brouillon : il est rattaché au code recherché, de sorte que refaire la même recherche le
  retrouve, y compris un code corrigé. Il est stocké sous la clé existante
  `cdg-parking.contributions.v1:<chemin>`.

## Laissé au développeur

Libellés exacts des aides, mise en page de l'état vide, normalisation de la clé de brouillon.
