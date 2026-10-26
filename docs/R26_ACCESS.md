# Accessibilité des parcours R26

Les pages R26 réutilisent les commandes clavier, navigation facultative à la manette et conservation de focus R24, ainsi que les règles de lien d’évitement R25. Ces fichiers historiques ne sont pas réécrits. Le lecteur ajoute un champ de lien nommé et sélectionnable au clavier, un statut expliquant l’empreinte et la position, et une comparaison d’image publiée commandée par case à cocher.

Les Dossiers distinguent les modèles exacts, les candidats, les sons de groupes publiés, les citations et les planches dérivées. Les sons ne se chargent pas automatiquement ; les planches ne sont pas présentées comme sprites du jeu. Un index hostile reste du texte inerte et les cibles externes ou hors des pages de sources autorisées sont refusées. Si l’index R26 est invalide, la section historique R25 reste disponible.

`tests/browser-access-r26.mjs` contrôle les pages disponibles à 1280 et 320 pixels, axe-core 4.14.0, les contrastes simples visibles, le texte racine à 200 %, le clavier, les contrôles de position/comparaison, les API manette absentes/refusées ou simulées et les Dossiers à 1280/390 pixels. Les contrôles incomplets d’axe sont conservés dans le rapport ; ils ne valent pas conformité WCAG complète. Les appareils tactiles, manettes physiques et lecteurs d’écran réels restent à éprouver.

Preuve reproductible : `docs/R26_ACCESS_BROWSER.json`. Les captures sont des sorties locales ignorées sous `qa-access-r26/`.
