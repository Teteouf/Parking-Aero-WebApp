L’application se concentre sur la recherche parking ↔ porte CDG et les codes
IATA d’aéroports et de villes. Le scanner de cartes d’embarquement et le
serveur d’extraction ADP ont été retirés. Les 169 correspondances d’origine
et le QR de partage sont conservés.

L’interface compacte propose favoris, dernières recherches et modes jour/nuit
mémorisés sur l’appareil. L’interface et le répertoire IATA sont enregistrés
localement après une première visite, avec activation explicite des mises
à jour. Les icônes d’installation disposent de formats Apple et Android.

Le workflow GitHub Actions construit le cache, lance les tests et publie
uniquement `public/` après une fusion dans `main`. Pour la première migration,
configurer Settings → Pages → Source sur GitHub Actions avant la fusion.

Validation : 24 tests locaux réussis ; recherches dans les deux sens, codes
IATA, mémorisation du thème et démarrage depuis le cache vérifiés dans le
navigateur avec le serveur local arrêté. Affichage contrôlé à 320 et 390 px.
La validation sur de vrais iPhone et Android reste à effectuer après publication.
