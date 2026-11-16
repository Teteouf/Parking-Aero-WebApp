# Proposition depuis une recherche sans résultat — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** depuis une recherche « Parkings & portes » sans résultat, ouvrir le formulaire de contribution existant en mode `propose` (code prérempli et modifiable, correspondance facultative, brouillon persistant, copie ou courriel, rien n'est transmis).

**Architecture :** on ajoute un type `propose` à `public/js/contributions.js`, qui contient la logique pure testée sous Node. L'état vide de `render()` dans `public/js/app.js` gagne un bouton `data-propose`. `openContribution` sait ouvrir ce type sans fiche. Deux champs, masqués pour les autres types, sont ajoutés à `#contributionForm`.

**Tech Stack :** JS navigateur sans dépendance, `node:test`, Playwright 1.65.1.

**Spec :** `docs/superpowers/specs/2026-11-16-proposition-code-introuvable-design.md`

## Global Constraints

- Bouton affiché uniquement en mode parking, pour une recherche non vide sans aucun résultat (correspondances et éléments documentés). Libellé exact : « Proposer un parking ou une correspondance ».
- Ne pas toucher à `public/js/mappings.js`, à `public/js/extension-data.js` ni à la clé `cdg-parking.preferences.v1:<chemin>`.
- Brouillons sous la clé existante `cdg-parking.contributions.v1:<chemin>`. `VERSION` reste à 1 : les nouveaux champs sont additifs.
- Code proposé : `pattern="[A-Za-z0-9\-]{1,12}"`, `required`, `maxlength="12"`.
- Le message ne doit jamais affirmer qu'il a été envoyé.
- Après toute modification de `public/` : `npm run build`.

## Review Focus

- Une recherche faite de mots (par exemple « zz top ») : le code prérempli est normalisé (majuscules, espaces retirés, 12 caractères au plus). Un code invalide après correction bloque la copie avec une erreur accessible.
- Rouvrir le formulaire pour une autre recherche ne doit pas reprendre le brouillon de la précédente : la clé est le code recherché normalisé.
- Ouvrir ensuite une fiche « Proposer une correction » : les champs `propose` sont masqués et désactivés, et ne bloquent pas l'envoi.
- Une recherche vide ou une recherche IATA sans résultat : aucun bouton.
- Effacer le brouillon : le code recherché est prérempli de nouveau.

---

### Task 1 : logique `propose` dans contributions.js

**Files :** Modify `public/js/contributions.js` · Test `tests/contributions.test.js`

**Interfaces — Produces :**
- `KINDS.propose = { title: 'Proposer un parking ou une correspondance', subject: 'Proposition' }`
- `CODE_TYPES = { stand: 'Parking', gate: 'Porte', unknown: 'Je ne sais pas' }`
- `FIELDS` gagne `'proposedCode'` et `'codeType'`.
- `proposalCode(query: string) -> string` : majuscules, sans espaces, 12 caractères au plus.
- `buildMessage('propose', { code: <recherche>, searched: <recherche brute> }, values)`

- [ ] Tests (échouent d'abord) :
  - `proposalCode(' zz 99 ') === 'ZZ99'`.
  - Le message `propose` sans `answer` contient « Recherche sans résultat : ZZ99 », « Code proposé : ZZ98 », « Nature du code : Porte », « Correspondance : non indiquée (aucune n’est supposée) » et « ne modifie pas les données ». Il ne contient ni « envoyé » ni « reçu ».
  - Avec `answer: 'K43'`, il contient « Correspondance proposée : K43 ».
  - Le brouillon `propose` conserve `proposedCode` et `codeType`, et laisse intacte la clé des préférences.
- [ ] Implémenter, puis faire passer `npm test`.

### Task 2 : bouton dans l'état vide et formulaire en mode propose

**Files :** Modify `public/js/app.js`, `public/index.html`, `public/css/app.css` (si nécessaire) · Test `e2e/proposition.spec.js` (nouveau)

**Interfaces — Consumes :** Task 1.

- [ ] Tests e2e (échouent d'abord) :
  - « ZZ99 » : bouton visible ; « E22 », « B20 », une recherche vide et le mode IATA « QQQQ » : bouton absent.
  - Clic : dialogue « Proposer un parking ou une correspondance » ; « Code proposé » vaut `ZZ99` et a le focus ; « Porte ou parking associé » n'est pas obligatoire.
  - Code vidé ou « ZZ 99! », puis « Copier le message » : `aria-invalid="true"` et erreur décrite. Même chose pour « Ce code est… ».
  - Remplir, recharger, rechercher « ZZ99 », rouvrir : valeurs restaurées, y compris le code corrigé. Rechercher « ZZ77 » : formulaire vierge, code `ZZ77`.
  - Courriel : message « Rien n’est transmis… » ; `#draftStatus` contient « Non transmis ».
  - Copie (Chromium) : le presse-papiers contient « [CDG Parking] Proposition — ZZ98 ».
  - Après une proposition, « Proposer une correction » sur E22 ne montre pas les champs `propose`.
  - Hors connexion (serveur arrêté) : brouillon `propose` conservé après rechargement.
  - Favori E22 et historique conservés après une proposition.
- [ ] HTML : champ `#contribProposedCode` (`name="proposedCode"`, `data-error`) et fieldset radio `codeType`, dans un conteneur `#proposalFields` masqué par défaut.
- [ ] app.js : `emptyHtml` reçoit une action facultative. Le clic `[data-propose]` dans `#results` appelle `openProposal(query)`, qui fixe `state.detail = { type: 'proposal', kinds: ['propose'], code, searched, draftCode: code }` puis `openContribution('propose')`. `openContribution` active ou désactive `#proposalFields`, rend `answer` facultatif et adapte le contexte affiché. La réinitialisation et l'effacement du brouillon repréremplissent le code.
- [ ] `npm test`, `npm run test:e2e`, `npm run build`.

### Task 3 : vérifications finales et commit

- [ ] Capture en émulation mobile Pixel 7 du formulaire `propose`.
- [ ] `npm run build`, `npm test`, `npm run test:e2e` : tout passe.
- [ ] Commit sur `essai-b-superpowers`, sans push.
