# R29 — poses relues, corps documentés et éditions séparées

La surcouche R29 conserve les 385 cibles : 363 images actives et les 22 refus initiaux. Les 106 images dont la pose restait indéterminée ont été vues avec toutes leurs références effectivement utilisées, sur 36 captures navigateur. Chaque observation lie le record R28, la source, l’image et la capture à leurs SHA-256. Aucune pose n’est désormais indéterminée ; cette classification ne certifie pas une fidélité 1:1.

## Résultat effectif

| Mesure | R28 | R29 |
| --- | ---: | ---: |
| Images actives | 363 | 363 |
| Corps anatomiques conjointement qualifiés dans la source et la sortie | 106 | 112 |
| Poses neutres observées, tous périmètres | 32 | 34 |
| Attentes statiques latérales admises au combat | 32 | 32 |
| Poses encore indéterminées | 106 | 0 |
| Refus initiaux conservés | 22 | 22 |
| Nouvelles variantes documentaires séparées | 0 | 4 |

Cinq PNG R29 remplacent la même identité active après vérification du SHA du PNG R28 : Zombie RE0, Mimicry Marcus, Chainsaw Majini RE5, Executioner RE5 et Jill ennemie RE5. Les deux corps RE0 étaient déjà anatomiquement qualifiés ; les trois nouveaux corps RE5 ajoutent trois qualifications. La revue des anciennes images ajoute Neptune RE1, Ant Code: Veronica et Alcina Village. Le cumul atteint donc 112 corps, dont 109 combattants et trois rencontres contextuelles. Il reste 251 corps non conjointement qualifiés : 211 combattants et 40 rencontres contextuelles.

Le Zombie RE0 utilise exclusivement le modèle natif de la variante aux cheveux bruns et manteau long. Son libellé de variante et la différence avec l’ancien portrait blond en manches courtes restent visibles. Le corps de Chainsaw Majini ne complète pas sa tronçonneuse ; les armes, accessoires ou géométrie P30 encore non qualifiés sont également signalés pour Executioner et Jill. Les sources et sorties des neuf nouveaux PNG ont été vues côte à côte dans `docs/R29_BODY_VISUAL_EVIDENCE/`.

## Conditions d’admission

Une attente statique exige une revue, un corps complet dans la source et la sortie, une pose neutre, un côté gauche/droit réellement produit, un périmètre de combattant et aucune lacune d’apparence explicitement connue. Une valeur historique `completeBodyReferenceVerified:false` décrit la déclaration du job figé ; les qualifications effectives restent fondées sur les observations manuelles et leurs preuves SHA-liées. Ce booléen historique n’est pas réécrit.

Les 34 poses neutres observées comprennent Ant, qui reste une rencontre contextuelle, et Alcina, dont l’extrémité du porte-cigarette est tronquée dans la source et la sortie. Leur anatomie est entière, mais aucun des deux n’ajoute une attente de combat. Les cinq remplacements R29 sont des poses frontales de liaison ; ils n’ajoutent aucun état de combat. Les neuf identités actives portant des lacunes d’apparence explicites restent énumérées séparément dans `body-gaps.json`, y compris lorsqu’elles possèdent un corps anatomique entier. Les vues opposées ne sont jamais fabriquées par miroir.

Les images Wall Blister et Scagdead héritées de R28 proviennent elles aussi de modèles HD/PC 2013. Deux notes R29 distinctes lient chaque entrée R28, PNG, manifeste source, entrée de modèle et référence à leurs SHA-256. Leur libellé affiche désormais le port source et la comparaison 3DS 2012 ouverte ; une lacune d’apparence précise que l’équivalence entre éditions reste non vérifiée. Les PNG, les observations anatomiques et la cible historique restent conservés, sans nouvelle admission ni revue de pose supplémentaire. Ces deux qualifications historiques ne créent pas de variantes supplémentaires.

## Revelations : ne pas confondre le port HD avec la cible 3DS

Les quatre nouvelles images Ooze, Chunk Ooze, Tricorne Ooze et Pincer Ooze proviennent de références natives HD/PC 2013. Faute de preuve d’équivalence avec l’édition 2012/3DS du catalogue, elles restent dans `documentaryVariants[]`, hors des 363 actifs et du registre de combat. Elles ne ferment aucun des quatre manques corporels de la cible 3DS.

Dans la galerie, la vue active du catalogue reste affichée par défaut. Le bouton « HD/PC 2013 — comparaison 3DS ouverte » montre la variante réelle, ses références et ses limites. Le lien direct suit `?identity=UID&variant=UID-hd-pc-2013`. Un identifiant de variante ne peut pas servir une autre identité. La différence de disposition des pieds de Pincer reste aussi explicite ; un corps visible entier ne certifie pas la pose originale exacte.

## Refus et provenance

La tentative de révision du Tyrant RE1 Remake a reçu un nouveau refus effectif de l’outil. Sa requête et sa réponse sont conservées dans `sprites/revision-failures/re1r-tyrant.json` ; l’ancien PNG actif reste inchangé. Ce refus de révision est compté séparément des 22 cibles initiales en attente et n’a pas été retenté.

Le constructeur vérifie les empreintes des 106 observations, sources, contacts et images, les références effectivement transmises à l’outil, la filiation des remplacements et la séparation des éditions. Une preuve ou requête portant explicitement `targetEditionAdmitted:false` interdit son admission comme remplacement actif, même si ce flag a disparu du record normalisé. Les PNG restent les sorties originales de l’outil ; l’analyse ne réécrit pas leurs pixels. Les fichiers R28 et antérieurs restent figés.

## Vérification reproductible

```sh
python scripts/build-sprite-overlay-r29.py --check
python tests/test_sprite_overlay_r29.py
node tests/verify-combat-sprites-r29.mjs
node tests/browser-generated-sprites-r29.mjs
```

Les rapports obtenus sont `docs/R29_SPRITES_TESTS.json` (15 contrôles), `docs/R29_COMBAT_SPRITE_TESTS.json` (8 groupes) et `docs/R29_SPRITES_BROWSER.json` (12 groupes). Le navigateur vérifie les cinq PNG actifs, les quatre choix d’édition, les liens directs et refus, les fichiers corrompus, les changements rapides de sélection, le focus clavier et le repli à 320 pixels. Le runtime vérifie les octets avant dessin, refuse une variante documentaire dans son registre et conserve les quatre acteurs historiques R20 séparés. Il ne modifie ni commandes, collisions, sauvegardes ni données de replay.

Les références et corps supplémentaires améliorent la documentation et les vues disponibles. Aucun cycle complet de combat, shader original, échelle physique, synchronisation sonore ni fidélité globale 1:1 n’est certifié par cette livraison.
