# R33 — Corps sources supplémentaires et mouvements complets

Le [lecteur R33](../modules/fidelity-r33/native/index.html) ajoute trois identités à la bibliothèque de vues natives : le Zombie de RE0 GameCube 2002, avec deux costumes séparés, le Chainsaw Majini et l’Executioner de RE5 PC 2009. Quatre caméras indépendantes rendent les quatre corps publiés, soit seize vues. Les poses en T sont conservées ; les armes absentes et les matériaux inconnus ne sont pas inventés. Une vue entière de cette pose ne devient pas un corps de combat terminé.

Six scènes Sea Creeper/Scagdead supplémentaires sont rendues sur toute leur durée, à leurs véritables clés de 60 Hz. Les douze séquences opposées comportent **1 270 nouvelles images**, plus douze références d’extrémité. Les 58 atlas copient exactement les cellules RGBA, sans interpolation de PNG ni retournement en miroir. Géométrie, poids, textures, courbes, translation source et fichiers FBX restent inchangés. La caméra orthographique et la lumière appartiennent à la dérivation.

| Sujet | Codes sources conservés | Observation visuelle ; action originale non attribuée |
| --- | --- | --- |
| Sea Creeper | `em1200_em1200_BA_17` | Corps horizontal, mouvements de nage des appendices et de la membrane. |
| Sea Creeper | `em1200_em1200_BA_7` | Rotation ample du corps puis retour vers l’attitude de départ. |
| Sea Creeper | `em1200_em1200_DM_61` | Bascule, torsion et repli des appendices. |
| Scagdead | `em1400_em1400_BA_105` | Flexion vers l’avant puis redressement du tronc. |
| Scagdead | `em1400_em1400_BA_7` | Rotation et balancement du tronc et du grand appendice. |
| Scagdead | `em1400_em1400_DM_91` | Abaissement et aplatissement du corps ; aucun KO ou résultat certifié. |

Les gestes décrivent les contacts réellement examinés. Les codes BA/DM ne suffisent pas à déterminer une attaque, une réception, une introduction ou une mort. Aucune nouvelle commande ou conclusion n’est affectée au combat. Les éditions PC/HD 2013 restent séparées des identités cibles 3DS 2012.

## Nage stationnaire observée, volontaire

Sea Creeper dispose aussi d’une revue nouvelle de son cycle `em1200_em1200_BA_1`, déjà rendu dans R30. **Ses 300 images de lecture, deux références de fin et leurs atlas R30 sont réutilisés à leurs chemins et empreintes exacts** ; ils ne sont pas recomptés dans les 1 270 nouveaux rendus.

Deux inspections visuelles indépendantes de la planche montrent un corps marin centré, avec mouvements coordonnés des membres et flexion de la membrane, sans frappe, déplacement volontaire ou transformation observés. Le lecteur peut répéter volontairement ce cycle. Le montage R33 peut le proposer comme présentation marine observée pendant l’état d’attente de notre adaptation 2D. Il ne certifie ni un idle original, ni un appui terrestre, ni l’équivalence des éditions.

La reconstruction de tous les sommets pondérés mesure la vraie couture entre la dernière image lue et la première : **1,0997 % de la hauteur source**, soit **43,14 % du plus grand pas adjacent natif à 60 Hz**. L’extrémité source, conservée séparément, revient à 0,0144 % de la hauteur du départ. Aucun doublon d’extrémité ni changement de durée n’est inséré pour réduire ces valeurs.

Le critère spécifique de cette nouvelle présentation aquatique autorise une couture d’au plus 1,5 % de la hauteur et au plus un pas adjacent maximal. Il est décrit dans la [revue](../modules/fidelity-r33/native/review/observations.json). Les seuils, manifestes, courbes et PNG R30 ne sont pas modifiés. Scagdead n’obtient pas cette qualification.

## Vérifications et limites

Les contacts effectivement inspectés couvrent **156 échantillons** : seize vues de corps, 120 vues des six scènes et vingt vues du cycle marin conservé. Les contrôles distinguent ces observations visuelles de la reconstruction complète et de la lecture réelle.

- **12 tests Python** : sources et membres d’archives conservés, trois identités réellement nouvelles dans la bibliothèque, chronologies complètes, chaque PNG alpha, RGBA des atlas et contacts, réutilisation marine et limites d’admission.
- **7 groupes Node** : reconstruction indépendante des six nouveaux clips et du cycle marin conservé à toutes leurs clés natives, correspondance des UV, déformations de plusieurs os, caméras opposées et mesures de couture réelles.
- **9 groupes navigateur** : seize vues fixes et 48 positions animées comparées aux vrais PNG, changements d’atlas, lecture de nombreuses images, répétition volontaire, clavier natif, erreurs dépassées, corruption, interruptions et reprise. L’affichage de 320 px avec texte réellement doublé et axe est contrôlé ; stockage du jeu inchangé.

Les interruptions et erreurs injectées des recettes navigateur sont des fixtures explicites. Ces contrôles ne certifient pas un écran ou GPU physique, une restauration BFCache réelle, les pixels du moteur Capcom, les collisions, les dimensions en mètres, les noms d’action originaux ou les idles de toutes les incarnations. Les 22 refus de génération initiaux et le refus de révision Tyrant restent conservés.

```bash
python3 scripts/prepare-native-r33.py --check
python3 scripts/pack-native-r33.py --check
python3 tests/test_native_r33.py
node tests/verify-native-motion-r33.mjs
node tests/browser-native-r33.mjs
python3 scripts/build-native-r33.py --check
```

La reproduction des nouveaux rendus utilise `node scripts/render-native-r33.mjs`, puis `python3 scripts/pack-native-r33.py` et `python3 scripts/build-native-r33.py --review`. Elle nécessite les versions du workflow, Chromium et sa capacité WebGL. La lecture et les recettes ordinaires utilisent les médias conservés ; elles ne prétendent pas rendre le jeu d’origine.
