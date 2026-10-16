# Rendu latéral — reprise R3 sur le moteur 0.7.3

## État réel

Le renderer commun et son choix gauche/droite sont intégrés dans le projet, pas dans une image illustrative. **La refonte graphique de tous les personnages n’est pas terminée.**

Le jeu possède 346 corps de combat (115 modes principaux + 231 essais isolés), et 43 exercices contextuels sans corps physique dans ce renderer. Ces derniers ne sont pas comptés comme des sprites réalisés.

Cette reprise raccorde trois poses de référence existantes exploitables de profil : le corbeau de RE1, la larve de papillon d’Outbreak et la larve de RE2. Leur dessin bilatéral est réfléchi après revue explicite ; ce ne sont pas deux anatomies opposées redessinées. Le Bandersnatch dispose de sa vue droite native uniquement ; sa vue gauche reste à produire et n’est jamais obtenue en inversant son bras hypertrophié. Trois autres corbeaux reçoivent une correction de direction de leur référence trois-quarts, sans être comptés comme de vrais profils complets.

**Aucune nouvelle illustration de personnage, aucune nouvelle paire anatomique indépendante et aucune animation définitive n’a été produite.** Les tentatives de génération n’ont fourni aucun asset utilisable pour cette intégration. Les images promotionnelles produites dans le fil sont exclues des sources et du build ; leurs compteurs et annonces ne sont pas une preuve de fonctionnalités.

Les 343 autres identités n’ont pas une couverture gauche/droite validée. La majorité conserve sa référence frontale ou partielle, clairement indiquée. Ne pas annoncer « tout le projet est désormais latéral ».

## Ajouts R3 (2026-10-16)

- Une animation non chargée conserve la pose latérale du même côté lorsqu’elle est disponible, plutôt que de montrer le portrait frontal. L’échec reste visible dans les diagnostics.
- Les réactions non bouclées démarrent à leur transition observée. Le temps de simulation arrêté conserve la frame ; retour temporel, nouvel acteur et nouveau choc réinitialisent leur horloge de présentation. Les attaques utilisent toujours leur tick réel. Aucun état de combat n’est écrit.
- Les états de marche, recul, garde sous impact, saut, accroupissement et KO sont aussi déduits des champs réels de l’acteur quand un appelant ne fournit pas tous les indicateurs de dessin.
- L’atelier inspecte 21 états/commandes avec lecture, pause, pas de 1 tick, retour à zéro et saisie de tick bornée. Les deux côtés sont vérifiés ensemble, avec accès direct au laboratoire du sujet. Une recherche vide masque les anciens liens.
- La larve RE2 utilise son illustration native complète de profil. Cinq dessins obliques d’animaux ont seulement leur sens de référence et leur réflexion de présentation revus ; ils ne sont pas comptés comme des profils latéraux stricts.
- Le cache libère aussi la surface détourée lors de l’éviction d’un sprite.

Le gain graphique est limité : 3 poses natives bidirectionnelles au total, 0 paire anatomique indépendante, 0 nouvelle animation dessinée. Cette passe ne termine pas la demande de tous les personnages latéraux.

## Changements exécutables

- Tous les usages du renderer commun choisissent les mêmes fichiers par UID et par côté : Versus, Dossiers, conclusions, laboratoires et duels expérimentaux.
- La direction engagée par l’attaque prévaut pendant un croisement. Reculer ne retourne pas le personnage ; les collisions et la direction logique appartiennent toujours au moteur existant.
- Une image frontale n’est ni écrasée, ni tournée, ni déclarée latérale.
- Les références non examinées ne sont plus inversées automatiquement. Une réflexion exige une revue de ce dessin, avec exception explicite par UID pour les animaux bilatéraux dont le drapeau ancien était conservateur.
- Les familles anatomiquement asymétriques protégées (notamment Birkin, Bandersnatch, Nemesis et T-002) n’acceptent pas cette exception.
- Les vues indépendantes ne subissent pas de deuxième inversion. Leur crop et leur ancrage au sol sont propres au côté.
- Le renderer sait lire de vraies séquences dessinées gauche/droite pour idle, marche, recul, dash, saut, accroupissement, garde, hit, knockdown et les dix commandes. Leurs frames ne sont utilisées que si elles existent et ont été examinées. Aucun mouvement de bras n’est fabriqué à partir d’un portrait.
- Les animations dessinées utilisent leurs frames et ancrages sans ajout de rotation, de balancement ou de grossissement du sprite entier.
- Délimitation PNG/WebP, dimensions effectives, SHA-256, rectangle des frames et taille constante vérifiés avant build ; chemins externes ou liens symboliques refusés.
- Une vue directionnelle indisponible à l’exécution retourne à la référence provisoire avec avertissement, pas à un rectangle invisible déclaré valide.
- Le bouton d’inversion de l’atelier échange les positions des acteurs A/B tout en les laissant se faire face. Il ne les retourne plus tous les deux vers l’extérieur.
- Détourage à l’exécution du noir connecté au bord uniquement pour les petites références explicitement examinées. Les pixels sombres internes et les portraits documentaires restent conservés.

## Données et compatibilité

Les définitions de combattants, les movesets, les hitboxes et les dossiers ne sont pas modifiés. Les contrats de combat et de journal contextuel demeurent ceux de la base. Version de gameplay : 0.7.3 ; révision du registre graphique : 3.

`docs/DIRECTIONAL_WORKORDERS.json` décrit chaque corps, ses références, ses états à dessiner et ses côtés manquants. Il ne certifie pas une revue visuelle de l’ensemble des 346 sources.

## Ajouter un vrai asset de profil

1. Produire les deux vues de la même incarnation, sans changer le côté anatomique des armes, membres et organes.
2. Placer les PNG/WebP sous `assets/lateral/<uid>/`.
3. Mesurer le fichier : `npm run inspect:directional-image -- assets/lateral/<uid>/left.png left`.
4. Le descripteur retourné est **reviewed:false**. Vérifier visuellement silhouette, incarnation, cadrage et pieds avant de le passer à true et de l’ajouter à `data/directional-art.json`.
5. Fournir le côté droit distinct pour toute asymétrie. Ne pas utiliser un même fichier/crop comme deux vues opposées.
6. Exécuter `npm run compile:directions`, `npm run audit:directions`, `npm run verify`, `npm run build`.

Les crops directionnels sont en pixels. Sans crop, le canvas source entier est conservé pour éviter de déplacer les pieds par un détourage implicite. Une animation utilise `clips.<état>.left/right` avec path/facing/projection/reviewed/width/height/anchor/sha256, `loop` et une liste de `frames` contenant `crop`, `ticks` et éventuellement `anchor`. Toutes les frames d’un clip partagent les mêmes dimensions.

## QA et publication

Tests hérités R2 : sélection de frames, asymétries, stabilité des données, dimensions raster, positions de l’atelier. Les tests pixels utilisent des textures techniques de test, pas de nouveaux personnages. Les vues Chromium sont testées hors ligne par injection des véritables HTML/JS/CSS/images : la navigation directe locale a été bloquée par l’environnement. Ce n’est pas un test de déploiement réseau, de téléphone ou de manette physique.

La PR reste un chantier graphique incomplet. Une archive et une PR ne prouvent ni une fusion dans main, ni une mise en production Vercel.

R3 : 13 groupes de contrôles supplémentaires, chaîne complète de 215 contrôles passée localement avec skia-canvas. Deux parcours Chromium hors ligne supplémentaires en 1440/390 px (pas de réseau ni appareil physique). Résultats ciblés dans `docs/DIRECTIONAL_R3_TESTS.json` ; empreintes des données préservées dans `docs/DIRECTIONAL_R3_PRESERVATION.json`. Les captures du rapport de livraison proviennent de l’atelier exécuté, pas d’une génération graphique.
