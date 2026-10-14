# Mettre à jour Parking-Aero-WebApp

Conserver le dépôt `Teteouf/Parking-Aero-WebApp` et l’adresse
https://teteouf.github.io/Parking-Aero-WebApp/ : le QR original et les
raccourcis des agents pointent déjà vers cette adresse.

La configuration constatée au 14 octobre 2026 est `main` / racine, avec le
déploiement automatique GitHub Pages classique. La nouvelle application a
son entrée dans `public/index.html`. Une publication de la racine du nouveau
projet ne convient donc plus. Le workflow `.github/workflows/pages.yml`
publie uniquement le contenu de `public/` et conserve l’adresse existante.

## Préparation locale

Le dossier de travail avait été extrait d’une archive, sans métadonnées Git.
La préparation locale a été réalisée en reprenant les 84 commits de GitHub :
initialisation du dossier, connexion du dépôt, récupération des références,
puis réinitialisation **mixed**, qui laisse les fichiers de travail en place.
Le dossier est désormais un dépôt Git et cette initialisation n’a plus à être
répétée. Les correspondances et le QR original ont été comparés aux fichiers
de `origin/main` et sont identiques.

La branche de préparation utilisée est `refonte-compact-offline` et son point
de départ est `origin/main`. Les fichiers racine de l’ancienne application
(scanner, serveur ADP, anciens manifestes et copies d’icônes) apparaissent
supprimés ; leurs anciennes versions restent dans l’historique Git.
Les nouveaux dossiers `public/`, `src/`, `scripts/`, `tests/`, `resources/`
et `docs/`, ainsi que `.github/`, doivent être inclus dans la modification.
Le ZIP de publication, les dépendances npm et les fichiers `.env` sont exclus.

Dans PowerShell, depuis le dossier de travail :

```powershell
Set-Location 'C:\Users\Theo\Documents\projet aero\Parking-Aero-WebApp-main'
git status --short
git diff --stat
npm run build
npm test
git add -A
git diff --cached --stat
git commit -m "Refonte CDG Parking : recherche locale, IATA, favoris et modes jour/nuit"
git push -u origin refonte-compact-offline
```

Ne pas ajouter un dossier englobant `Parking-Aero-WebApp-main/` dans le dépôt :
`package.json`, `public/` et `.github/` doivent être directement à sa racine.
Le ZIP `cdg-parking-public.zip` contient seulement les fichiers du site ; il
ne remplace pas les sources, les tests et le workflow du dépôt.

## Vérification sur GitHub

1. Ouvrir le dépôt, puis le bouton **Compare & pull request** qui apparaît
   après l’envoi de la branche. Cible : `main`. Source : `refonte-compact-offline`.
2. Créer la pull request et regarder **Files changed** : les nouveaux dossiers
   remplacent les fichiers obsolètes. La description peut reprendre
   `docs/description-refonte.md`.
3. Dans **Checks**, attendre la réussite de **Construire et vérifier**.
   Cette vérification reconstruit le cache et lance les tests ; elle ne publie
   pas le site depuis la pull request.
4. Ouvrir **Settings → Pages**. Sous **Build and deployment**, choisir
   **Source → GitHub Actions**. Le workflow est déjà fourni : aucun modèle
   supplémentaire n’est nécessaire.
5. Revenir sur la pull request et choisir **Merge pull request** pour mettre
   cette version en ligne. La fusion déclenche la publication automatiquement.
6. Dans **Actions**, attendre que **Vérifier et publier CDG Parking** soit
   entièrement vert, y compris **Publier sur GitHub Pages**.

La préparation et l’envoi d’une branche ne publient pas la refonte.
La fusion dans `main`, une fois la source Pages configurée, est l’étape de
mise en ligne. Le jeton temporaire fourni par GitHub Actions suffit : aucun
secret, mot de passe ni token personnel n’est à ajouter au projet.

## Vérifier le site publié

Ouvrir https://teteouf.github.io/Parking-Aero-WebApp/ et vérifier `E22 → K43`,
la recherche inverse `K43`, le répertoire `CDG` et `PAR`, les favoris, le
bouton jour / nuit et le QR original. Attendre **Disponible hors connexion**,
fermer le site, couper le réseau et ouvrir le raccourci sur le téléphone.

Si une version déjà installée propose **Nouvelle version · Actualiser**,
utiliser ce bouton. Si le raccourci conserve une ancienne icône, le retirer
puis l’ajouter de nouveau depuis la page mise à jour.

Les versions suivantes utilisent le même chemin : modifier les sources,
construire et tester, envoyer une branche puis fusionner sa pull request.
GitHub Pages reçoit l’application complète après réussite des vérifications.
Les mises à jour IATA restent une opération de maintenance explicite :
`npm run update:iata`, puis construction et tests avant publication.

## Revenir à une version précédente

Après cette première migration, les versions qui conservent `public/` et le
workflow se rétablissent avec **Revert** sur leur pull request, puis le même
déploiement Actions. La reconstruction du cache permet aux appareils de
recevoir ce retour comme une nouvelle version à actualiser.

Un retour complet à l’application antérieure à la migration est un cas
distinct : il remettrait les fichiers à la racine et retirerait le workflow.
Il demanderait la restauration de **Deploy from a branch → main → /(root)**
et une procédure de retrait du service worker des appareils déjà mis à jour,
sinon ils continueraient à afficher leur version enregistrée. L’historique
permet de récupérer ces anciennes sources sans réécrire les commits.

Références :
[source de publication GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site),
[workflows personnalisés](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
