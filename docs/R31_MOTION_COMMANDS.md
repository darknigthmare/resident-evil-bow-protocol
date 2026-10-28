# R31 — mouvements natifs et répertoires de commandes

Le [lecteur des mouvements](../modules/fidelity-r31/motion/index.html) présente huit scènes natives supplémentaires dans leur durée complète : 2 016 images à 60 Hz, deux côtés réellement rendus par scène, et 16 références finales séparées. Les six identités sont Ooze, Tricorne Ooze, Pincer Ooze, Farfarello, Wall Blister et Chunk Ooze. Les fichiers proviennent des archives FBX PC/HD2013 déjà conservées ; ils ne constituent pas une acquisition de huit nouveaux personnages, ni une certification de l’édition 3DS2012.

Les 160 vues de contacts à caméra fixe et 40 vues de contacts supplémentaires ont été inspectées. Les descriptions restent des observations : pas successifs, bascule et redressement, flexion prolongée, réaction du buste, corps couché puis aplatissement, élan aérien et déploiement des membres. Aucun nom d’action original n’est déduit des codes BA/DM/UZ. Une posture au sol ou une forme aplatie ne prouve pas une défaite, et une scène aérienne ne prouve pas une introduction.

Farfarello BA101 et Wall Blister BA102 contiennent une translation verticale très importante. Les vues fixes conservent leur trajectoire entière et rendent donc le corps petit. Un second aperçu propose 248 images supplémentaires : la caméra suit exactement la translation de la vraie racine bone0, avec orientation et échelle fixes. Les sommets, os, poids, textures, courbes, transformations et trajectoires d’origine restent inchangés. La désactivation du rejet de frustum pour les peaux animées évite de faire disparaître le corps à partir de sa boîte initiale statique. Les deux recettes de caméra et chaque position de racine sont conservées ; cet aperçu est réservé à l’inspection.

Les atlas sont des assemblages RGBA sans perte des PNG sources. Les 2 264 cellules sont comparées exactement ; les 2 284 PNG de production et références finales sont décodés et vérifiés. Le lecteur charge quelques atlas à la demande, vérifie taille, SHA et dimensions, et borne le cache à quatre images et 16 millions de pixels décodés. La lecture est volontaire, ne crée pas de raccord ou de boucle, et s’arrête au dernier instant source. Elle ne modifie aucun acteur, résultat, commande, sauvegarde ni replay.

Le [répertoire](../modules/fidelity-r31/commands/index.html) audite les 389 UID et les 3 460 commandes adaptées déjà présentes dans 346 profils. Il relie 235 revendications documentaires conservées à leurs manifestes exacts, avec phase, conditions, portée et polarité. Les deux revendications négatives liées restent négatives. Les huit gestes observés sont distingués des commandes ; aucun bouton original d’ennemi, timing officiel, nouveau slot ou affectation de clip n’est inventé. Les identités contextuelles le restent.

Les chantiers R20-09, G-COMMANDES, G-CINEMATIQUES et G-MANCHES restent ouverts. Il manque notamment les preuves originales de rôle, de déclencheur, de partenaire, de victime, de raccord, d’environnement et de bande sonore avant d’attribuer ces scènes à une introduction, une conclusion ou un résultat. Aucune nouvelle animation de combat, aucun idle cible complet et aucune fidélité globale 1:1 ne sont déclarés.

Recette exécutée :

- Python tests/test_motion_commands_r31.py : dix tests réels sur les membres ZIP originaux, les PNG/atlas, les répertoires, les contextes et la reproduction.
- Node tests/verify-native-motion-r31.mjs : huit groupes indépendants reconstruisant les sommets à tous les instants natifs et vérifiant la trajectoire exacte suivie par les caméras d’inspection.
- Node tests/browser-motion-commands-r31.mjs : dix groupes sur les vrais pixels, les positions sources, le franchissement d’atlas, les deux caméras, les 389 UID, le clavier à320px/texte200%, la corruption, les chemins forgés et la reprise après interruption de manifeste ou décodage.

Les rapports [Python](R31_MOTION_TESTS.json), [squelettes](R31_MOTION_RIG_TESTS.json) et [navigateur](R31_MOTION_BROWSER.json) lient les sources exécutées par SHA. Ils ne certifient pas une fréquence d’affichage sur appareil physique.

Les sélections et assemblages se reproduisent avec :

    python3 scripts/prepare-native-motion-r31.py --check
    python3 scripts/pack-native-motion-r31.py --check
    python3 scripts/pack-native-motion-r31.py --check --root-follow
    python3 scripts/build-motion-repertoire-r31.py --check
