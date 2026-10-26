# R26 — mouvements des variantes Ooze

Chunk Ooze, Tricorne Ooze et Pincer Ooze sont désormais consultables depuis leurs publications communautaires **PC/HD de Revelations (2013)**. Cette attribution ne certifie pas l’édition 3DS de 2012 ou l’égalité aux paquets Capcom bruts. Les pages Models Resource et Evil Resource de chaque sujet sont conservées, avec leurs octets, URL, dates de consultation et SHA-256.

| Référence | Cibles nommées | Maillages pondérés | Mouvements après zéro | Poses fixes à clés | Bases sans clés |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chunk Ooze — em1030 | 22 | 4 | 119 | 2 | 1 |
| Tricorne Ooze — em1020 | 24 | 8 | 110 | 2 | 1 |
| Tricorne — objet om120a | 6 | 2 | 1 | 0 | 1 |
| Tricorne — objet wp1c00 | 2 | 4 | 0 | 0 | 1 |
| Pincer Ooze — em1010 | 24 | 6 | 121 | 3 | 1 |
| Pincer — objet om120a | 6 | 2 | 1 | 0 | 1 |

Le total est de **350 mouvements corporels, deux mouvements d’objets associés, sept poses fixes à clés et six bases sans clés**. Les 359 fichiers à clés ne sont donc pas 359 mouvements corporels. Les objets gardent leur propre rôle et ne deviennent pas d’autres incarnations.

Les trois ZIP originales restent intactes : 44 136 625, 63 258 811 et 85 352 847 octets, soit 192 748 283 octets au total. Le lecteur R26 autorise un flux d’archive borné à 96 Mio et un membre FBX à 12 Mio ; les trois archives restent chacune sous la limite GitHub de 100 Mio. Aucun fichier d’animation n’est dupliqué en dehors de son archive ; le lecteur extrait le seul membre sélectionné.

Le modèle, ses textures explicitement reliées et les preuves de matériaux sont livrés à côté de chaque référence. L’importateur exige **2 154 correspondances exactes de nom d’objet, topologie et UV dépliées**, puis reprend les matériaux d’origine. Il ne choisit aucune texture au jugé et ne modifie ni les coordonnées, ni les poids, ni les courbes, ni leurs temps. Les pré-clés négatives restent intactes ; la lecture commence à zéro. L’étendue totale des clés et la durée de lecture restent distinctes.

Les codes BA, DM et suffixes ne suffisent pas à nommer une attaque, une mort, un impact ou une transformation. Chaque scène conserve `semanticActionVerified: false`. Aucune intégration finale au combat, nouvelle planche de sprites, échelle physique ou égalité au rendu du jeu n’est annoncée.

Validation : **10 tests Python réussis**, dont la reproduction de tous les fichiers et l’inspection des 365 scènes dans les dossiers Animations ; corruption d’archive, chemins sortants, inconnus, fausse clôture, topologie/UV modifiées et attribution de textures refusés. **359 contrôles Node réussis** vérifient les octets, les cibles animées d’origine, les matrices des copies de chaque os et tous les sommets pondérés à cinq instants. Les 352 mouvements déforment effectivement des sommets après zéro ; les sept poses fixes restent fixes. Le chargement des textures est remplacé par des textures vides dans ce contrôle de géométrie, qui ne certifie donc pas un rendu visuel ou un appareil physique.

Reproduction hors ligne depuis la racine du dépôt :

```sh
python scripts/import-rigged-motion-r26.py --check
python -m unittest discover -s tests -p test_rigged_motion_r26.py -v
node tests/verify-motion-skeletons-r26.mjs
```

Preuves : `modules/fidelity-r26/motion/manifest.json`, `docs/R26_MOTION_IMPORT_REQUEST.json`, `docs/R26_MOTION_EVIDENCE.json` et `docs/R26_MOTION_SKELETON_TESTS.json`.
