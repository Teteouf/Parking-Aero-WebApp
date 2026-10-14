# Sources des icônes

- `app-icon-original.png` : copie exacte de l’image fournie par Theo le
  14 octobre 2026 (512 × 512). SHA-256 :
  `7c2e8acf4a8a61f201caa01a430d2a8ddf91ecdb0bdf22c3bcb3d232631f19a7`.
- `app-icon-maskable.png` : adaptation de la même illustration avec le tool
  imagegen intégré, pour obtenir un fond carré continu et une composition
  adaptée aux masques Android. Le prompt est dans `maskable-prompt.txt`.

`scripts/build-icons.ps1` exporte les formats PNG opaques (Apple, standard et
adaptatif) et le favicon ICO depuis ces deux sources. Les pixels opaques de
l’original sont conservés pour la version standard avant sa réduction ; seuls
les coins transparents reçoivent un fond. La version adaptative reçoit une
marge supplémentaire de 6 % avant sa réduction pour protéger l’avion et le
repère dans le cercle central de rayon 40 %.

Les sources ne sont pas incluses dans le dossier public ni dans le cache.
La planche `docs/preview-home-icons.png` montre les découpes simulées, dont le
cercle minimal garanti des icônes maskable. Le script n’appelle aucun service
réseau et ne régénère pas les illustrations.
