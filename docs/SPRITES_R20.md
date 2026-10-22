# R20 — sprites de présentation indépendants

## Contenu réellement livré

Cinq PNG séparés à fond transparent couvrent quatre identités dans `assets/sprites/bow/`. Chaque fichier représente un corps entier en pose d’attente ; Nemesis possède une présentation armée et une variante de production sans arme. Les quatre présentations principales sont disponibles dans le menu principal. Tyrant T-00 et Nemesis s’affichent aussi dans la sélection Versus ; les versions Licker 2019 et Hunter 2002 appartiennent au catalogue expérimental et ne remplacent pas les autres incarnations du roster principal. Aucun de ces fichiers ne remplace les séquences de combat existantes.

| Identité | Incarnation | PNG | Dimensions | État disponible |
| --- | --- | --- | --- | --- |
| `re2r-tyrant` | Resident Evil 2 remake, 2019 | `assets/sprites/bow/re2r-tyrant/idle-right.png` | 1024 × 1536 | Une pose entière |
| `re2r-licker` | Resident Evil 2 remake, 2019 | `assets/sprites/bow/re2r-licker/idle-right.png` | 1536 × 1024 | Une pose entière |
| `re1r-hunter` | Resident Evil remake, 2002 | `assets/sprites/bow/re1r-hunter/idle-right.png` | 1254 × 1254 | Une pose entière |
| `re3r-nemesis` | Resident Evil 3 remake, 2020, stade 1 | `assets/sprites/bow/re3r-nemesis/idle-right-armed.png` | 1024 × 1536 | Une pose entière avec lance-roquettes |
| Variante de production Nemesis | Même incarnation, corps sans arme | `assets/sprites/bow/re3r-nemesis/idle-right.png` | 1024 × 1536 | Une variante, téléchargeable dans l’atelier |

Le total des cinq PNG est de **11 752 490 octets**. Leur canal alpha est vérifié pixel par pixel ; entre 48,0 % et 61,5 % des pixels sont complètement transparents. Le RGB résiduel des pixels alpha nul n’est pas un fond visible et n’est pas supprimé à la main. Les octets retournés par la génération sont conservés.

## Provenance et niveau de fidélité

Les fichiers ont été produits avec l’outil intégré `image_gen`, à partir des références locales déjà associées à chaque incarnation. Les prompts exacts sont conservés dans `assets/sprites/bow/generation-prompts.json`. La variante Tyrant a reçu une seconde passe de détourage par le même outil. Aucun dessin procédural ni remplacement SVG n’a été utilisé.

Ces images sont des interprétations générées pour le projet. Le costume, les traits principaux et la famille d’incarnation ont été contrôlés visuellement sur les références locales. **Une conformité géométrique 1:1 n’est pas certifiée.** Les sources d’origine des références figurent dans chaque manifeste ; elles ne signifient pas que ces nouveaux fichiers sont des ressources officielles.

Les images sont orientées vers la droite en vue trois quarts. Aucune vue opposée n’est déclarée produite. Le retournement horizontal est refusé par l’API pour ne pas inverser les attaches, les membres et l’appareil thoracique de Nemesis. Le menu peut utiliser la même pose de présentation pour les deux côtés sans prétendre fournir une nouvelle vue.

La revue de la sélection a détecté que l’intitulé de Nemesis inclut son lance-roquettes. Une variante armée a donc été produite avec la référence existante et devient son image principale ; le corps sans arme est conservé comme variante de production. Cette correction ne constitue pas un équipement séparé sur rig : le lance-roquettes reste intégré aux pixels de la variante armée.

## Manifestes et consommation

`assets/sprites/bow/manifest.json` contient le registre cumulatif. Chaque dossier possède aussi `sprite-manifest.json` avec les mêmes informations : incarnation, dimensions, SHA-256, transparence mesurée, rectangle visible, pivot au niveau des pieds, état disponible, calques et limites. Le champ `variants` de Nemesis décrit le cinquième PNG avec sa propre empreinte et ses mesures.

Le rectangle visible est mesuré à un seuil alpha de 16/255. Les faibles pixels d’anticrénelage ne sont pas supprimés du fichier. Les pivots servent uniquement à l’alignement de l’image ; ils ne définissent pas de collision, de portée ou de taille canonique.

Le fichier `src/bow-sprite-library-r20.js` expose `BOWSpritesR20` sans dépendance au moteur de combat :

```js
const record = BOWSpritesR20.get('re2r-tyrant');
imageElement.src = BOWSpritesR20.url(record.id);

await BOWSpritesR20.load(record.id);
const result = BOWSpritesR20.draw(context, record.id, {
  x: 320, y: 540, height: 420, facing: 'right', state: 'idle'
});
```

`list()` retourne les quatre fiches gelées. `load()` ne charge que la pose disponible et partage les demandes concurrentes. Une erreur de téléchargement ou une dimension inattendue autorise une nouvelle tentative. Le cache est borné par les quatre identités du registre. `draw()` retourne un refus explicite pour une identité inconnue, une direction indisponible ou un état absent ; il ne substitue pas silencieusement une pose d’attaque.

`src/sprite-presentation-r20.js` observe uniquement l’identité de `p1Portrait` et `p2Portrait` dans la sélection Versus. Il affiche la pose correspondant à l’ID exact après chargement et conserve le canvas d’origine. Un changement rapide de sujet invalide le résultat précédent ; un ID non couvert ou un chargement refusé restaure le portrait d’origine. Cette présentation n’écrit ni sélection de combat, ni progression, ni replays. L’observation est suspendue au départ de page puis rétablie sans doublon lors de la restauration.

Après modification du manifeste, exécuter `node scripts/compile-sprites-r20.mjs`. Le contrôle sans écriture est `node scripts/compile-sprites-r20.mjs --check`.

## Atelier DEV

`dev-sprites.html?dev=1` permet de changer de sujet, afficher un fond clair, sombre ou damier, ajuster l’échelle, afficher le pivot et télécharger le PNG ou son manifeste. L’atelier documente une pose unique et n’imite pas une animation par translation ou rotation du corps entier.

## Validation et travaux ouverts

`node tests/verify-sprites-r20.mjs --report` exécute neuf groupes : quatre décodages PNG complets avec mesure d’alpha et vérification des empreintes ; cohérence du registre ; refus des états/identités absents ; reprise après erreur de chargement ; cache borné ; alignement du pivot et refus des directions manquantes.

Les résultats de cette suite se trouvent dans `docs/SPRITES_R20_TESTS.json`. La recette HTTP et l’intégration effective du menu sont suivies séparément dans la validation générale R20.

`node tests/browser-sprites-r20.mjs` contrôle dans Chromium les portraits de sélection, le retour au canvas d’origine, les changements pendant un téléchargement, une erreur réseau volontaire, les quatre images du viewer et ses commandes. Les événements `pagehide` / `pageshow` utilisés pour contrôler l’unicité de l’observateur sont simulés ; cela ne certifie pas BFCache sur matériel physique.

Restent à produire : les membres découpés, têtes/mâchoires indépendantes, équipements amovibles, vues opposées, cycles idle/marche/course, attaques, garde, impacts, chutes, intros, victoires et défaites, ainsi que l’extension au reste du registre. `modularParts`, `combatIntegrated` et le compteur de fidélité 1:1 sont donc explicitement faux ou nuls. Les anciennes ressources du dépôt sont conservées.
