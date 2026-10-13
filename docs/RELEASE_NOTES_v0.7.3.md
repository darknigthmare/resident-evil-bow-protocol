# B.O.W. Protocol v0.7.3 — Contacts et reprise

## Corrections du moteur
Un projectile revenant pouvait traverser entièrement sa cible sans infliger son second impact : sa cible est désormais réarmée avant le balayage, et uniquement après séparation. Un retour encore dans le corps ne bénéficie pas d'un double impact.
Un projectile non perforant ne peut plus emprunter le bonus d'un noyau situé après son premier contact avec le corps. Les zones superficielles frontales, dorsales et supérieures restent atteignables.
La sortie de combo utilise la direction du projectile à l'impact plutôt que l'orientation du tireur original.
Le dernier impact conserve le point de surface et le segment arrêté à ce point. Le rendu n'écrit pas dans la simulation.

## Laboratoires et reprise
Les deux laboratoires montrent CORPS, GARDE ou ZONE CRITIQUE, avec dégâts, frame et coordonnées. Le lien d'essai reproduit sujet, cible, commande, orientation, distance, garde et ouverture préparée, sans données de sauvegarde.
Les deux laboratoires, le duel expérimental et l'exercice contextuel redémarrent une seule boucle de rendu, en pause, lors d'un pageshow persisté. Ils conservent leur état et ne rejouent pas une attaque en attente.

## Tests
172 contrôles exécutables réussis, zéro échec. La nouvelle suite contient 19 cas reproductibles. Les événements de cache sont synthétiques dans les tests DOM. Les contrôles Chromium hors ligne sont séparés et ne prouvent pas une navigation HTTP ou une utilisation sur appareil physique.

## Préservation
115 combattants principaux, 231 prototypes isolés, 43 exercices contextuels. Aucune nouvelle animation finale, créature ou capacité canonique ajoutée. Le journal conserve ses données et son empreinte. Les replays de combat utilisent le nouveau moteur et conservent les fichiers anciens sans les migrer silencieusement.
Les tâches restantes de sprites définitifs, animations par technique, phases de boss et sources primaires restent ouvertes.

Références de cycle de page : MDN Window/pageshow_event et Window/requestAnimationFrame. Les paramètres de collision sont ceux de ce prototype, pas des données Capcom.
