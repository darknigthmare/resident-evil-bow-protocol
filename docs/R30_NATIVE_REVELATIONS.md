# R30 — Sprites 2D issus des mouvements natifs de Revelations

Le lot rend six scènes FBX publiées de **Resident Evil Revelations HD/PC (2013)** sous deux vrais angles de profil. Il livre **2 532 PNG de lecture à 60 images/s**, **12 PNG de fin de cycle**, **104 atlas PNG sans perte** et **6 planches de contrôle**. Les modèles, poids, UV, textures et courbes sources restent inchangés ; aucune image générée, déformation de PNG ou animation de respiration inventée n’entre dans ce lot.

Le navigateur utilise les atlas pour préparer plusieurs images à l’avance. Chaque cellule conserve exactement les valeurs RGBA du PNG natif correspondant. Le cadrage et l’échelle restent fixes pendant tout le cycle et pour chacun des profils. Le profil opposé est rendu par une seconde caméra, sans miroir de l’anatomie asymétrique.

| B.O.W. | Scène source | Durée native positive | Images par profil | Observation |
| --- | --- | ---: | ---: | --- |
| Ooze | `em1000_em1000_BA_1` | 4,15 s | 249 | Balancement neutre observé |
| Chunk Ooze | `em1030_em1000_BA_1` | 4,15 s | 249 | Balancement neutre observé |
| Tricorne Ooze | `em1020_em1000_BA_1` | 4,15 s | 249 | Balancement neutre observé du corps publié |
| Pincer Ooze | `em1010_em1000_BA_1` | 4,15 s | 249 | Balancement neutre observé |
| Farfarello | `em1240_em1230_BA_1` | 2,666667 s | 160 | Respiration et balancement accroupi observés |
| Wall Blister | `em1410_em1410_BA_0` | 1,833333 s | 110 | Étude native ; action non attribuée |

Les cinq premières boucles sont disponibles comme **présentations PC/HD2013 explicites et facultatives** dans l’interface R30. Le choix doit être fait par l’utilisateur. Elles ne remplacent pas par défaut les incarnations 3DS2012 et n’obtiennent aucune certification globale 1:1. Le code `BA_1` n’est pas une preuve de l’action « idle » : la qualification vient de l’observation des poses, de la continuité mesurée et de l’absence de pas, frappe ou transformation observés. `sourceActionCertified`, `originalIdleActionCertified` et `actionVerified` restent faux. L’admission pour l’édition d’origine et la liste `admittedCombatStates` restent respectivement fausse et vide.

Le Wall Blister lève une jambe et projette largement ses appendices. Le contexte public décrit des tentacules agités et une charge, mais ne permet pas d’identifier cette scène. Il garde une lecture native fluide dans la bibliothèque et reste exclu des variantes neutres de combat.

## Références et observations

Les publications de modèles et les archives exactes sont référencées dans `modules/fidelity-r26/models/catalog.json` et `modules/fidelity-r27/motion/catalog.json`. Le lot réutilise les scènes FBX exactes conservées par R29, avec leur SHA-256. Six pages Evil Resource ont été réellement téléchargées avec HTTP200 et sont conservées sous `native/revelations/research/` : elles documentent l’identité et le comportement général des créatures, sans attribuer un code FBX à une action de jeu. Une recherche Web sans résultat pertinent est enregistrée comme non admissible ; son contenu n’est pas utilisé comme référence.

Les six images de contrôle ont été inspectées, à raison de vingt vues chacune : deux côtés, plusieurs moments couvrant le cycle entier, dernière image de lecture et fin native séparée. Les observations sont liées aux empreintes de **tous** les PNG du cycle et de chaque planche. Les 1 266 poses de lecture et les 6 fins de scène sont ensuite reconstruites indépendamment depuis le FBX original, avec contrôle de tous les sommets pondérés à chaque instant. Les empreintes quantifiées à 0,0001 unité source sont uniquement une mesure entre environnements ; aucun sommet rendu n’est quantifié.

Pour les cinq variantes neutres, la distance quadratique moyenne entre la dernière image de lecture et la première vaut **0,297 % à 0,951 % de la hauteur du corps source**, et reste inférieure au plus grand mouvement entre deux images natives voisines. Il n’y a ni fondu, ni interpolation entre PNG, ni suppression du mouvement source pour masquer un raccord. Les images sont prises à chaque clé positive native de 60 Hz ; le point final est conservé séparément pour contrôler le raccord. La clé négative d’initialisation de l’exporteur reste dans le FBX et n’est pas comptée comme une image de jeu.

## Limites conservées

La publication concerne le port HD/PC2013. L’équivalence de géométrie et d’animation avec la version 3DS2012 n’est pas établie. Le rendu Three.js, son éclairage et son traitement des matériaux ne sont pas le moteur d’origine ; le canal FBX `SpecularFactor` n’est pas pris en charge. Le point d’appui fixe est une projection du minimum Y des bornes sources sur l’ensemble du cycle ; il ne certifie pas la collision ou les contacts anatomiques du jeu. Les objets associés aux archives ne sont pas attachés sans preuve de leur rôle et de leur liaison.

**0 sprite original extrait du moteur, 0 action idle originale certifiée, 0 incarnation 3DS2012 déclarée complète par ce lot.** Les cinq variantes neutres observées rendent les mouvements natifs utilisables sans modifier ces limites de fidélité.

## Reproduction et contrôles

- `node scripts/render-native-revelations-r30.mjs` : rendu natif ; reprise uniquement lorsque les entrées et le moteur de rendu correspondent aux empreintes conservées.
- `python3 scripts/pack-native-revelations-r30.py` : atlas sans perte et planches de contrôle.
- `python3 scripts/review-native-revelations-r30.py --check` : validation des observations réellement effectuées et de leurs liens aux images.
- `python3 tests/test_native_revelations_r30.py` : 8 contrôles, dont décodage et cadrage de 2 544 PNG, comparaison exacte des 2 532 cellules d’atlas et refus des changements d’édition ou de scène.
- `node tests/verify-native-revelations-r30.mjs` : 6 contrôles indépendants du squelette, de tous les sommets, des raccords et des sources.

Les rapports se trouvent dans `docs/R30_NATIVE_REVELATIONS_TESTS.json` et `docs/R30_NATIVE_REVELATIONS_RIG_TESTS.json`. La bibliothèque R30 est accessible par `modules/fidelity-r30/native/index.html?id=rerev-ooze`.
