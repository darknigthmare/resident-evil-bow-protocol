# Sources natives complémentaires R30

Le lot `modules/fidelity-r30/native/other-games/manifest.json` apporte quatre poses statiques utilisables : Stinger de RE0 et Zombie au manteau vert de RE1, chacun rendu par deux vraies caméras latérales opposées. Les corps, textures, poses et coordonnées publiés sont conservés. Aucun miroir ni image générative n’a servi à ces exports. Une pose statique n’est pas comptée comme une animation idle.

Le Zombie correspond précisément à « Zombie 1 (Green Trenchcoat) », publié pour Resident Evil sur PlayStation. Le dossier générique `re1-zombie` reçoit cette variante nommée ; l’ancienne qualification candidate du catalogue R26 demeure intacte dans la provenance. Aucun costume différent n’est déduit. Stinger provient du modèle GameCube de Resident Evil 0.

| Production réelle | Nombre |
|---|---:|
| Modèles statiques existants, dérivés sans réécriture | 13 |
| Vues orthographiques transparentes à élévation zéro | 52 |
| Poses latérales statiques admises en état neutre | 4, sur 2 identités |
| Vues réservées à la sélection, caméra surélevée de 45° | 6, sur 3 modèles |
| Clips natifs complets supplémentaires | 2 |
| Séquences natives à caméras latérales opposées | 4 |
| Images natives dérivées à 60 Hz | 578 |
| Images de fin réservées à la vérification de boucle | 4 |
| Animations idle admises dans ce lot | 0 |
| Captures HTTP 200 de pages sources | 30 |
| Modèle retenu pour texture source manquante | 1 |
| Images certifiées identiques au moteur des jeux | 0 |

Les nouvelles séquences sont Sea Creeper (150 images par côté, 2,5 s) et Scagdead (139 images par côté, 2,3167 s). Chaque image vient d’un instant natif distinct de l’armature et de ses poids d’origine. Les caméras, échelles et pivots restent fixes par séquence. La fin originale est conservée séparément pour mesurer la jonction avec la première image, sans ajouter une image artificielle à la boucle.

Sea Creeper conserve une présentation aquatique, avec les membres suspendus. Scagdead présente des jambes repliées ou relevées durant le cycle étudié. Ces mouvements restent disponibles pour l’étude native ; leur correspondance à une posture neutre de combat au sol n’est pas établie. Les suffixes `BA_1` ne constituent pas une preuve d’action. Les deux sources sont les publications PC/HD 2013 ; leur équivalence avec les dossiers 3DS 2012 n’est pas déclarée.

L’examen des réglages binaires FBX confirme que les deux corps statiques déclarent Z vertical et les deux scènes animées Y vertical. La caméra Y utilisée pour les animations suit donc leur déclaration propre. Aucun changement des os ou de la géométrie n’a été appliqué pour tenter de transformer une pose en posture neutre.

Les autres vues statiques restent retenues lorsque la source montre une pose en T, une langue sortie, un corps aplati, une chaîne détachée ou une édition différente. Le modèle Uroboros de RE5 demande le fichier absent `unknownmaterial` ; l’export échoue explicitement et aucune texture de remplacement n’est inventée. Les six vues surélevées de Lurker, Centurion et Stinger servent exclusivement aux avatars de sélection. Elles n’entrent jamais dans les poses latérales de combat.

Les 52 vues statiques et 64 échantillons de mouvement ont été inspectés sur contacts, avec des inspections supplémentaires des images complètes. Les six vues de portrait ont aussi été inspectées. Les 640 PNG de production et de fin de boucle sont décodés et vérifiés : sommes SHA, dimensions, transparence, absence de bord coupé et bornes alpha réelles. Une reconstruction indépendante recalcule tous les sommets aux 289 instants natifs et deux fins de clip, puis vérifie les deux vues produites à chaque instant : 582 PNG de mouvement et de fin liés à leurs coordonnées réelles. Les signatures quantifiées à `1e-4` unité native servent uniquement à comparer les mesures entre moteurs JavaScript ; les coordonnées rendues ne sont jamais quantifiées.

La tranche des 5 % de sommets les plus bas est une mesure géométrique générique. Elle peut inclure une scie, des doigts ou d’autres extrémités ; elle ne constitue pas une identification anatomique des pieds. Les observations visuelles et les déclarations d’axes restent séparées de ces mesures.

Validation exécutée : `python3 tests/test_native_other_r30.py` (12 tests réussis), `node tests/verify-native-other-motion-r30.mjs` (2 groupes réussis), puis `python3 scripts/pack-native-other-r30.py --check`. Les rapports correspondants sont `R30_NATIVE_OTHER_TESTS.json` et `R30_NATIVE_OTHER_MOTION_RIG_TESTS.json`. Le classeur et le runtime utilisent uniquement le manifeste combiné ; ils ne comptent pas à nouveau le sous-manifeste des mouvements.
