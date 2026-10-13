# B.O.W. Protocol — v0.7.3 : Contacts et reprise

Version cumulative basée sur main b8330410ca9880914aac110285af965f3db592a5 (PR9 intégrée). Aucun nouveau sujet ni sprite définitif ajouté.

## Lancer
Avec Node.js installé, ouvrir le dossier contenant package.json, puis exécuter `npm start`. Ouvrir l'adresse locale annoncée (par défaut http://localhost:5173). Les scripts LANCER_WINDOWS.bat et LANCER_MAC_LINUX.sh restent disponibles.

## Tester les corrections
Depuis laboratoire principal (`laboratory.html`) ou expérimental (`catalog-laboratory.html`), choisir tireur, cible, commande, distance et orientation. L'ouverture préparée est une aide de test, pas une capacité gratuite de combat. Le panneau affiche maintenant le dernier point de contact, les dégâts, la frame et la zone touchée. Le lien « LIEN DE CET ESSAI » reproduit uniquement ces paramètres, sans sauvegarde ou santé importée.

Les projectiles de retour rapides peuvent maintenant toucher à leur vrai passage. Une zone critique située derrière un premier contact avec le corps n'accorde plus son bonus à un projectile non perforant. Les quatre écrans d'essai reprennent leur boucle en pause après un événement de restauration de page, sans attaque en attente.

## Données conservées
115 combattants des modes principaux ; 231 prototypes isolés ; 43 exercices contextuels abstraits. Total 389 identités, pas 389 combattants finalisés 1:1. Les profils et le contrat du journal contextuel sont conservés. Les anciens replays de combat sont gardés et nécessitent leur version de moteur d'origine.

## Validation et limites
172 contrôles exécutables réussis. Huit contrôles Chromium locaux hors ligne séparés, sans erreur JavaScript ni dépassement horizontal du document. Les événements de cache y sont synthétiques ; aucune certification de cache réel, téléphone/manette physique ou navigation HTTP publique.

Lire RELEASE_MANIFEST_v0.7.3.json, RELEASE_NOTES_v0.7.3.md et SOURCES_CONTACT_v073.md. Les scripts de boss, animations par technique, sprites définitifs et vérifications primaires exhaustives du lore restent à terminer. Les zones de collision sont des approximations du moteur 2D, pas des données internes Capcom.

La branche et ses archives n'impliquent aucune fusion dans main ni publication Vercel. Le statut de livraison effectif est indiqué dans la PR et le rapport fourni séparément.
