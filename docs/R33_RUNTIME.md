# R33 — Présentations source et sélection dans les combats actuels

Les trois montages actuels utilisent un registre composite R33 sans modifier les moteurs, acteurs ou contrats de replay. Le catalogue généré R31 et son option Zombie 2002 restent identiques par défaut. Huit PNG nouveaux forment quatre familles source GameCube avec côtés produits indépendamment ; les éditions PlayStation cibles ne sont pas déclarées équivalentes.

Zombie Dog RE2 et Zombie RE3 blonde proposent volontairement leurs poses adaptées gauche/droite. Giant Alligator reste contextuel et Giant Moth reste une étude de pose compacte. Le lecteur résout le côté demandé et préserve les replis existants pour les attaques, déplacements, gardes et autres états non produits. Une pose fixe n’est pas un cycle idle.

La bibliothèque native passe de 50 à 53 identités. Les nouvelles poses en T et les armes RE5 absentes restent hors admission au combat. Trois portraits de sélection utilisent leurs vues de tête/haut du corps, avec cadrage CSS sans réécriture de l’image et édition source affichée. L’avatar Jack à scie à ciseaux reste manquant.

Une variante marine Sea Creeper réutilise les 300 images R30 de deux orientations séparées, à 60 Hz sur la durée native. Le menu l’annonce comme une « boucle aquatique observée » et signale l’absence d’appui terrestre et d’idle original certifié. Le choix reste volontaire dans le document courant et respecte la réduction des mouvements.

Les lecteurs coordonnés conservent le budget R31 de 33 554 432 pixels, réservations de décodage comprises. La recette force explicitement une réservation synthétique de ce budget, puis vérifie la reprise automatique des vrais PNG gauche/droite. Le rapport conserve le temps observé de récupération et les temps de soumission de 250 dessins chauds. Les échantillons individuels à 0 ms sont sous la résolution du chronomètre ; ils ne signifient pas un dessin gratuit. Ces mesures locales ne représentent ni le temps GPU, ni la mémoire totale du navigateur, ni la fréquence de l’écran physique.

Les panneaux de variantes emploient des dimensions fluides et du texte relatif à la racine. À 320 pixels, les contrôles clavier et un texte effectivement doublé ont été vérifiés avec les PNG réels. Axe 4.14 est exécuté sur les deux panneaux concernés ; une manette physique ou un lecteur d’écran réel n’est pas certifié par cette recette.

Validation exécutée : [dix groupes Node](R33_RUNTIME_TESTS.json), [huit groupes navigateur](R33_RUNTIME_BROWSER.json). Les tests contrôlent aussi les familles invalides, l’identité exacte, les côtés, la corruption, l’annulation d’un décodage, les crédits et les acteurs/replays inchangés lors d’un duel naturel.

```sh
python3 scripts/build-runtime-r33.py --check
node tests/verify-runtime-r33.mjs
node tests/browser-runtime-r33.mjs
python3 scripts/build-runtime-r33.py --validation
python3 scripts/build-runtime-r33.py --validation --check
```

Les anciens fichiers de runtime restent à leurs chemins publiés. R33 les prolonge avec des lecteurs séparés et conserve les API de présentation attendues par les adaptateurs. Aucun nouvel idle original ni fidélité globale 1:1 ne sont certifiés.
