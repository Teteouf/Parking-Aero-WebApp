# 🛫 Antisèche Point de Parking

Une application web légère pour convertir rapidement les codes de parking d'avion en portes d'embarquement à l'aéroport Charles de Gaulle (CDG).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://teteouf.github.io/Parking-Aero-WebApp/)

## 🎯 Pourquoi cette app ?

Dans le cadre du travail aéroportuaire, il est fréquent de recevoir des numéros de places de parking d'avion et de devoir trouver rapidement la porte d'embarquement correspondante. Cette application permet de faire cette conversion instantanément, sans avoir à consulter des documents papier ou des tableaux complexes.

## ✨ Fonctionnalités

- 🔍 **Recherche instantanée** : Tapez un code de parking ou de porte pour trouver la correspondance
- 🎤 **Recherche vocale** : Dictez le code à l'oral au lieu de taper
- 📱 **QR Code de partage** : Partagez facilement l'application avec vos collègues
- 💬 **Feedback rapide** : Signalez un problème ou suggérez une amélioration en un clic
- 🚀 **Mode hors ligne** : Fonctionne sans connexion internet
- 📊 **125 correspondances** : Toutes les portes des terminaux 2E et K
- 🏷️ **Tags informatifs** : Terminal, contacteur, au large, ascenseur

## 🚀 Utilisation

L'application est accessible directement en ligne : [https://teteouf.github.io/Parking-Aero-WebApp/](https://teteouf.github.io/Parking-Aero-WebApp/)

### Recherche manuelle
1. Tapez le code de parking (ex: E22) ou de porte (ex: K43) dans la barre de recherche
2. Les résultats s'affichent instantanément

### Recherche vocale
1. Cliquez sur le bouton micro 🎤
2. Autorisez l'accès au micro si demandé
3. Dictez le code (ex: "E vingt-deux")
4. Les résultats s'affichent automatiquement

### Partager l'app
1. Cliquez sur le bouton de partage 🔗 en haut à droite
2. Un QR code s'affiche
3. Scannez-le avec votre téléphone pour accéder à l'app

## 💻 Installation locale

Si vous souhaitez exécuter l'application localement :

```bash
# Cloner le repository
git clone https://github.com/Teteouf/Parking-Aero-WebApp.git

# Ouvrir le dossier
cd Parking-Aero-WebApp

# Ouvrir index.html dans votre navigateur
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux
```

Aucune installation ou dépendance nécessaire ! C'est une simple page HTML.

## 🛠️ Technologies utilisées

- HTML5
- CSS3 (avec animations et gradients)
- JavaScript Vanilla
- Web Speech API (reconnaissance vocale)
- QRCode.js (génération de QR codes)
- Progressive Web App (fonctionnement hors ligne)

## 📊 Données couvertes

L'application couvre actuellement :
- **Parkings E** : E10 à E90
- **Parkings F** : F10 à F70
- **Portes K** : K20 à K57
- **Portes L** : L31 à L70
- **Portes M** : M09 à M76

Soit **125 correspondances** au total pour les terminaux 2E et K de CDG.

## 🤝 Contribuer

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

Vous pouvez également signaler des bugs ou suggérer des fonctionnalités via l'application elle-même (bouton "Signaler un problème") ou en ouvrant une [issue GitHub](https://github.com/Teteouf/Parking-Aero-WebApp/issues).

## 📝 Roadmap

- [ ] Ajouter d'autres terminaux de CDG
- [ ] Mode sombre
- [ ] Historique des recherches récentes
- [ ] Export des données en PDF
- [ ] Multilingue (anglais)
- [ ] Widget iOS/Android

## 📧 Contact

Théo Dargos - dargos.theo@hotmail.fr

Lien du projet : [https://github.com/Teteouf/Parking-Aero-WebApp](https://github.com/Teteouf/Parking-Aero-WebApp)

## 📄 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

⭐ Si cette application vous est utile, n'hésitez pas à mettre une étoile sur GitHub !
