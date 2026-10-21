# PR12 — R15 : trois ambiances originales, neuf couches et écoute contrôlée

Base de la même PR nº 12 : `4810b5e74f97e41f0fdddcec565246fa72003b01` (R14). R11 Lucas, R12 Flying Bug, R13 replays et R14 décors restent intégrés. Pas de fusion main ni promotion de production.

## Candidat exécuté et preuve

Le candidat `70acee91af4e05f15f81dee6fddfbb519ba0e3d9` contient le code et le XLSX. Le workflow https://github.com/darknigthmare/resident-evil-bow-protocol/actions/runs/39386895139 a réussi : **478 groupes exécutables**, **64 scénarios HTTP**, compilation et packaging. Les 952 fichiers du candidat ont été reconstruits et vérifiés individuellement avec le manifeste de l’artefact authentifié. Ses 508 ressources antérieures sont conservées.

La publication ajoute uniquement ce document et le workflow HTTP permanent R15. Aucun son, contrôleur, donnée de jeu ou fichier Excel n’est modifié après ces résultats. Les checks du commit final de la PR fournissent une seconde exécution, à lire séparément, sans doubler les compteurs.

## Travail effectivement livré

Trois compositions stéréo originales de 12 secondes, synthétisées depuis le code, possèdent trois couches chacune : garage (ventilation, pluie sur la fenêtre, résonance métallique), grenier (souffle, charpente, voilage), zone d’essai (installation électrique, conduits, moniteur). Le mix est la somme des couches. Aucun enregistrement, musique ou voix Capcom extrait ; ce n’est pas une certification de la bande-son de RE7.

Le module sonore partagé du Versus principal et des Dossiers reconnaît ces trois salles. Les 49 autres configurations gardent les six familles génériques antérieures, contrôlées au niveau de leurs échantillons. Le volume d’ambiance reste indépendant des effets de combat et du volume général. L’absence du module conserve le repli existant.

L’atelier comporte activation/coupure, choix du mix ou d’une couche, volume et écoute isolée de 12 secondes. Cette écoute fonctionne lorsque le décor est figé ou en réduction de mouvement ; elle ne fait avancer aucune frame. Fin automatique, arrêt volontaire, pause, changement de salle/couche, recherche vide et perte de visibilité sont traités. Aucune préférence ni progression n’est écrite par l’atelier. Le contexte audio n’est pas créé avant une activation utilisateur.

L’offset de lecture part de la frame demandée. Web Audio avance ensuite sur sa propre horloge et un écart supérieur à 0,25 seconde provoque une remise à l’offset voulu. Il ne s’agit pas d’une garantie de synchronisation acoustique échantillon par échantillon. Un seul nœud d’ambiance joue à la fois ; le cache des nouvelles boucles est borné à quatre, soit environ 18,5 Mo à 48 kHz, hors effets historiques.

## Vérifications et limites de la recette

Les 21 nouveaux groupes comprennent PCM déterministe, stéréo, mix/solo, raccords périodiques, amplitudes finies et bornées, activation, arrêt, pause/seek, graphes, cache, fallback et préservation. La chaîne complète reprend les 457 groupes antérieurs.

Les dix scénarios HTTP R15 utilisent un véritable AudioContext et OfflineAudioContext dans Chromium, en 1440 et 390 pixels, des clics/clavier natifs et le téléchargement du XLSX comparé octet par octet. L’écoute isolée est laissée jusqu’à son arrêt réel après 12 secondes dans le scénario 1440 pixels ; l’autre taille vérifie l’arrêt volontaire. Le match court au chronomètre est configuré et réellement avancé, pas remplacé par une victoire injectée.

Les 54 scénarios HTTP hérités (R14/R13/R12/R11/R10) sont rejoués dans le même workflow. Le rendu OfflineAudioContext reproduit exactement les trois buffers testés, sans dépassement numérique. Cela ne constitue ni une écoute subjective ni un essai sur casque/enceintes physiques. Les WAV de preuve sont les mix générés avant les volumes du jeu, pas un enregistrement du périphérique de sortie.

Les premiers essais CI ont détecté un contrôle historique qui exigeait le fichier audio R14 inchangé, puis deux assertions de navigateur qui lisaient le graphe avant le tick de reprise. Le contrôle de préservation est maintenu avec les SHA exacts du prédécesseur et du successeur. Les assertions attendent le nœud réel actif, sans délai arbitraire ni tolérance relâchée. Ces essais interrompus ne sont pas comptés comme réussis.

La suite locale complète n’a pas été certifiée : l’export des captures R14 utilise un backend natif indisponible localement et la navigation HTTP est refusée par la politique de l’environnement. Aucun contournement tenté. Les 21 tests ciblés locaux et le build ont passé séparément ; la CI exécute les dépendances prévues.

## Excel et périmètre conservé

`docs/planning/BOW_AMBIANCES_BAKER_R15.xlsx` possède cinq onglets et quatre formules vérifiées. Ses 20 composants XML correspondent à l’export artifact_tool inspecté. Les 21 résultats locaux du classeur et son état de préparation précèdent la CI ; le présent document et les JSON exécutés consignent les résultats finaux.

Les trois lignes P1 `S-baker_garage_2017-AMB`, `S-guest_house_attic_2017-AMB` et `S-testing_area_2017-AMB` restent **EN COURS** : une composition originale ne prouve ni l’acoustique ni les sons précis du lieu source. Aucun lot artistique global ni contrôle de fidélité 1:1 n’est fermé. Les sept anciens classeurs sont inchangés.

115 principaux, 231 prototypes, 43 exercices, 115 Dossiers, mouvements, conclusions, images, physique et les trois contrats de replay/journal sont conservés. Aucun nouveau sprite, clip de personnage, cri, voix ou geste canonique. Les sons exacts des lieux, sons des créatures/armes, mix perceptif, bruitages événementiels et appareils physiques restent ouverts. Le duel expérimental complet n’obtient pas un nouveau système audio par cette passe.

La PR reste en brouillon. Aucune promotion Vercel, fusion main ou nouvelle copie Google Drive n’est impliquée par la publication.
