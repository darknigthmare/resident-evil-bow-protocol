# R34 — Personnages, puis arène, puis combat

Le parcours joueur possède désormais trois étapes exclusives sur le Versus principal, le duel catalogue et le nouveau montage avec évolutions :

1. Choisir les deux personnages, leurs formes et les présentations disponibles.
2. Valider les personnages, puis choisir l’une des 52 arènes dans un écran distinct avec aperçus, recherche et filtre d’épisode.
3. Confirmer l’arène pour lancer le contrôleur de combat existant.

Les anciennes commandes d’arène ne sont plus visibles dans la sélection des personnages. Le retour depuis les arènes conserve les deux identités, leurs formes et les choix de présentation ; il ne lance aucune simulation. Une arène choisie reste sélectionnée à la visite suivante. Le retour depuis le combat utilise les mécanismes de sélection existants et ne lance pas une revanche automatique.

Les aperçus appellent seulement le renderer d’arène existant, à temps fixe. Ils ne changent pas la configuration de simulation. Le sélecteur catalogue d’origine reçoit sa valeur seulement lors de la confirmation ; le même contrôleur crée alors l’introduction et le replay. Dans le Versus principal, l’API existante reçoit les deux identités et l’index d’arène. Timings, collisions, règles, données d’arène et contrats de replay ne sont pas réécrits.

## Préparation et commandes

`prepare.js` se charge dans le head avant les contrôleurs. Il protège la préparation pendant le téléchargement du flow complet. Sans ce bootstrap, un retard réel de `flow.js` permettait à P ou Start de lancer l’ancien duel avant la validation et laissait l’arène visible. La recette conserve une omission explicite du bootstrap comme témoin négatif et vérifie le document complet avec le même retard réseau ; aucun délai dépassé n’est admis comme preuve du défaut.

Pendant les menus, le getter navigateur de manette est temporairement masqué aux anciens lecteurs de combat. Le lecteur de menu utilise le getter original lié. La croix navigue, A active le contrôle choisi, Start valide une étape et B revient aux personnages. Un appui maintenu ne valide pas les deux étapes. Lors de l’entrée en combat, boutons et axes doivent revenir au neutre avant que la manette soit rendue aux anciens lecteurs : A ou Start ne devient donc pas une attaque, un saut ou une pause involontaire.

Le masque est local au document et réversible. Le descripteur d’origine est restauré à la sortie de page et repris au retour. Les raccourcis, retours de focus et vrais retours BFCache sont vérifiés séparément. Le polling du menu s’arrête en combat et lorsque le document n’est pas actif. Les contrôleurs originaux restent à leurs chemins et octets publiés ; aucune copie de moteur n’est introduite.

Au clavier, les flèches choisissent les cartes d’arène, Tab atteint les actions et Entrée les active nativement. Escape revient aux personnages. Un filtre qui masque la carte déjà choisie conserve un point de tabulation sur le premier résultat visible. Le rapprochement de recherche ignore accents et ponctuation, notamment pour `R.P.D.`. Les contrôles au survol gardent un contraste propre malgré le thème R20. À 320 pixels, le pied d’actions n’est pas fixe et ne recouvre pas les cartes lorsque le texte est doublé.

## Validation et périmètre

La [recette navigateur](R34_SELECTION_BROWSER.json) couvre seize groupes : les trois documents réels, étapes exclusives, retours, filtres, aperçus, démarrage unique, répétitions de touches fiables, commandes de manette avec sas de neutralité, focus, BFCache réellement persisté, texte effectivement doublé et axe 4.14. Les images du renderer sont réelles ; la manette standard et une cible locale de navigation sont des fixtures explicites. Cela ne certifie pas un périphérique physique ou un lecteur d’écran réel.

Le mode exact `?dev=1&selection=direct` conserve la présentation directe pour les anciennes recettes d’interface. Un seul de ces paramètres ne suffit pas. Ce mode et les cinq embeds déjà connus restent séparés du parcours joueur par défaut ; une ancienne recette exécutée dans cette fixture n’est pas une preuve du nouveau flow. Les API publiques de simulation/replay restent disponibles pour leurs outils existants.

```sh
node tests/browser-selection-r34.mjs
python3 scripts/build-selection-r34.py
python3 scripts/build-selection-r34.py --check
```

Le [handoff structuré](R34_SELECTION.json) lie les empreintes des trois nouveaux fichiers et de la recette exécutée, et vérifie que les trois contrôleurs originaux correspondent toujours au commit R33 publié `6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5`.
