# R27 — références d’apparence par incarnation

L’[index d’apparence](../modules/fidelity-r27/sources/index.html) réunit les références locales pour les 389 UID, avec 570 associations d’images et leurs octets, dimensions et SHA-256. Il permet de distinguer les portraits, scènes, corps déclarés historiquement, aperçus de modèles et planches dérivées avant la génération d’un sprite.

Les 93 drapeaux historiques `visual.fullBody` sont des déclarations conservées, pas 93 nouvelles certifications anatomiques. Certaines images restent rognées malgré ce drapeau. Le champ conservateur `bodyCoverage` n’est pas automatiquement promu ; les détails figurent dans [R27_SOURCE_COVERAGE_NOTES.json](R27_SOURCE_COVERAGE_NOTES.json). Une revue du fichier source et du résultat généré reste nécessaire avant toute admission comme corps complet.

Les 20 références R22 déjà revues gardent leur portée `body`, `portrait` ou `scene`. Une vue de visage de Mia ne devient pas une référence de ses jambes. Les 19 UID disposant de géométries attribuées restent distincts des candidats ; les objets associés et parties ne fournissent pas d’image de corps par substitution. Cinq UID disposent de planches montrant la géométrie publiée complète, avec éclairage de la recette, sans certification du rendu du jeu.

L’index conserve séparément les empreintes actuelles et les champs historiques du roster : 18 portraits ont une empreinte ou une taille historique différente du fichier actuel et sept n’ont pas les deux champs. Les images et le roster historiques restent inchangés. Cela ne démontre pas à lui seul une erreur d’identité ; la divergence reste visible pour la revue.

La galerie vérifie les octets avant affichage, charge les images de la seule incarnation choisie et annule les demandes périmées. Les textes restent inertes et les ressources extérieures au dépôt sont refusées. Le lecteur permet de filtrer les portées sans déplacer une référence candidate vers l’attribution exacte.

```sh
python scripts/build-source-appearance-index-r27.py --check
python -m unittest discover -s tests -p test_source_appearance_r27.py -v
node tests/browser-source-appearance-r27.mjs
```

Huit groupes Python et cinq groupes Chromium passent ; la recette couvre les 389 entrées, les empreintes, les limites de portée, les candidats, la corruption, les chemins extérieurs, une image retardée et l’affichage à 320 pixels avec texte agrandi. Voir [tests de sources](R27_SOURCES_TESTS.json) et [parcours navigateur](R27_SOURCES_BROWSER.json).

Ces associations constituent des références de production. Elles ne sont pas comptées comme de nouveaux sprites générés et ne certifient pas les membres cachés, orientations absentes, gestes ou proportions physiques du jeu d’origine.
