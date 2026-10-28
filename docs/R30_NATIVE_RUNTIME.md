# Sprites et mouvements natifs en 2D — R30

La bibliothèque `modules/fidelity-r30/native/index.html` réunit les lots natifs avec des liens par identité exacte : `?id=<UID>&sequence=<identifiant-de-vue>`. Elle distingue une vue statique, un mouvement source complet, un idle qualifié et une boucle neutre observée dont le nom d’action d’origine reste non certifié. Elle conserve l’édition de chaque source.

Le rendu est dérivé des modèles et des courbes natifs. Il ne certifie pas les pixels du moteur d’origine. Les références générées R29 conservent leur bibliothèque et leurs trois alias historiques ; elles ne deviennent pas des sprites natifs.

## Admission en combat

`combat/native-runtime.js` charge l’index R30 puis vérifie les tailles et SHA-256 des trois lots avant d’enregistrer les entrées. Chaque PNG ou atlas doit ensuite passer sa propre vérification de taille, SHA-256 et dimensions. Un lot incorrect reste refusé, sans enregistrer une partie de ses données.

Une pose statique native n’entre dans le rendu neutre que si l’édition cible est admise, le corps et la pose de combat ont été revus, la vue gauche ou droite existe réellement, les lacunes d’apparence sont absentes et le contrat déclare une pose neutre. Le résultat annonce toujours `animated:false` et une image. Une pose de liaison ou de présentation ne satisfait pas ces conditions.

Une animation idle exige en plus une séquence native complète à au moins 30 images par seconde, une attribution d’action vérifiée et une continuité vérifiée. Une séquence fluide dont l’action est inconnue reste consultable dans l’atelier, sans devenir un idle en combat.

Les boucles neutres observées d’une autre édition utilisent un choix distinct et volontaire dans « Rendus natifs en 2D ». Le contrat exige une inspection du mouvement complet, une continuité mesurée, une pose revue et `sourceActionCertified:false`. La variante n’est activée que pour l’identité choisie, dans la page courante. Elle ne remplace pas par défaut l’incarnation du catalogue et ne crée aucune préférence enregistrée.

`combat/native-adapter.js` s’insère après l’adaptateur R27 existant. Il utilise `pose.time`, déjà fourni par le moteur sous la forme `frame / 60`. Les attaques, déplacements, réactions, vues absentes et images encore indisponibles reviennent au rendu antérieur. L’adaptateur ne modifie aucun acteur, compteur, collision, commande ni replay.

## Lecture et chargement

Les séquences conservent une caméra, un pivot et une échelle fixes. Les cellules d’atlas reprennent leurs images sources sans miroir. Le rendu n’adapte pas l’échelle ou le centrage à chaque image.

La lecture de l’atelier est volontaire. Les boutons, le curseur et le clavier permettent d’inspecter les images indépendamment de la préférence de mouvement réduit ; le rendu de combat respecte cette préférence et fige l’animation sur la première image. Le changement de page ou la perte de visibilité suspend la lecture.

Les limites du décodeur sont explicites : 16 Mio par manifeste de lot, 8 Mio par PNG, 2048 × 2048 pixels par image, quatre décodeurs simultanés, 32 requêtes en attente et 32 images décodées au maximum, avec un plafond total de 16 millions de pixels décodés (environ 64 Mio RGBA). Le lecteur précharge une fenêtre de 16 images, ou 32 à la préparation ; plusieurs cellules d’un même atlas partagent un seul décodage. Il ne charge pas toutes les animations du catalogue. Les URL temporaires et les décodeurs sont libérés à `pagehide`.

## Vérifications

- `node tests/verify-native-runtime-r30.mjs` vérifie les admissions, l’horloge déterministe, les variantes volontaires, la corruption, les dimensions, les limites du cache, les cycles de page et la conservation d’un acteur figé. Ses métadonnées d’admission positives sont des fixtures explicites et ne qualifient aucune ressource livrée.
- `node tests/browser-native-runtime-r30.mjs` utilise les lots réels : correspondance RGBA PNG/atlas, lecture de nombreux instants natifs, franchissement d’une limite d’atlas, trois pages de combat, variante activée volontairement, comparaison du replay avant/après rendu, pose statique, navigation clavier à 320 pixels et refus d’un atlas corrompu.

Les rapports de test lient leurs fichiers d’entrée par SHA-256. Les observations de lecture Chromium restent des tests fonctionnels en environnement sans écran ; elles ne constituent pas une certification de fréquence d’affichage sur appareil physique.
