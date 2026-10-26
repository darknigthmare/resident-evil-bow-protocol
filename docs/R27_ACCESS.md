# R27 — accessibilité et ressources du navigateur

La suite [browser-access-r27.mjs](../tests/browser-access-r27.mjs) vérifie les nouveaux ateliers de R27 : suivi des chantiers, sprites, références d’apparence, mouvements, audio, citations et replays de la restauration isolée. Son [rapport complet](R27_ACCESS_BROWSER.json) énumère les pages effectivement parcourues ; `completeWorkbenchSet` doit être vrai pour représenter les sept pages.

La recette complète passe **22 groupes** : quatorze contrôles de règles/reflow, sept parcours clavier et un contrôle du chargement borné de la galerie.

La recette finale a été rejouée après le gel des données et l’ajout des cinq compteurs : **22 réussites, zéro échec, sept pages**. La galerie observée contient 363 PNG générés et 22 images non produites correspondant aux refus conservés ; son ouverture demande un seul PNG et conserve une seule URL Blob. Les 82 corps revus et 22 bases statiques admissibles restent des compteurs distincts des images générées.

## Contrôles

Chaque page est ouverte en Chromium à 1 280 et 320 pixels CSS. À 320 pixels, le texte racine est porté à 200 % et sa taille calculée est vérifiée ; le document doit rester sans défilement horizontal. Les règles automatisables WCAG A/AA, 2.1 et 2.2 sont exécutées avec axe-core 4.14.0. Les règles restant incomplètes sont conservées dans le rapport pour une revue humaine.

Un parcours clavier vérifie le premier lien d’évitement, son focus visible et sa cible locale. Le navigateur vérifie aussi que la galerie ne demande pas les 385 PNG dès l’ouverture : une seule image sélectionnée et une seule URL Blob peuvent être préparées à la fois. Le nombre d’images effectivement générées au moment de la visite est enregistré séparément du nombre encore attendu.

Les vérifications fonctionnelles des téléchargements, des textes hostiles et des erreurs de données restent dans les suites propres à chaque atelier. Le [parcours de restauration](R27_PERSISTENCE.md) contrôle en plus les vrais moteurs principal actuel et historique, le stockage IndexedDB et les limites de pagination et de téléchargement.

## Portée

Ces vérifications de navigateur ne certifient ni lecteurs d’écran réels, ni manettes ou appareils physiques, ni conformité WCAG complète. Elles ne certifient pas non plus les apparences, mouvements, sons, asymétries ou la fidélité des sprites aux jeux d’origine. L’inspection visuelle des captures reste distincte des règles automatisées.

Le rapport préliminaire, lorsqu’il existe, peut couvrir moins de pages ou des défauts ensuite corrigés. Seul le rapport complet avec zéro échec et les sept pages est utilisé pour déclarer cette recette terminée.

```sh
node tests/browser-access-r27.mjs
```

`AXE_CORE_PATH` peut désigner l’installation locale de `axe.min.js`. Pour une vérification ciblée pendant le développement, `BOW_ACCESS_R27_PAGES` accepte une liste de chemins relatifs séparés par des virgules ; `BOW_ACCESS_R27_REPORT` doit donner un autre nom JSON pour conserver le rapport complet.
