# R33 — Preuves par incarnation et écoute contextualisée

Le [lecteur R33](../modules/fidelity-r33/evidence/index.html) ajoute **35 extraits structurés pour 13 incarnations**, tirés de **20 pages HTTP 200 conservées** : dix références d’ennemis et dix transcriptions de fichiers du jeu publiées par Evil Resource. Une capture supplémentaire du blog RE7 est conservée comme recherche non concluante sur l’avatar de Jack à scie à ciseaux.

Les citations sont vérifiées dans le texte visible des captures, avec UID, jeu, phase, anatomie, conditions, taille et SHA-256. Les nouveaux extraits ne recouvrent littéralement aucun extrait du même UID dans les six manifestes canoniques R24, R25, R26, R27, R28 et R31. Ce contrôle mesure une nouveauté de **structuration dans ces manifestes** ; il ne signifie pas que ces faits étaient inconnus partout ailleurs.

## Apports et restrictions

| Incarnation | Ce qui est documenté dans ce lot |
| --- | --- |
| Stinger, RE0 | Longueur jusqu’à trois mètres **pinces comprises**, pinces durcies, tête vulnérable, apparition liée au pic à glace. |
| Centurion, RE0 | Déclenchement à la clé de feu et prédation humaine décrite. |
| Lurker, RE0 | Sens régressés, sortie de l’eau possible, expérience amphibienne décrite dans le rapport. Le texte du fichier ne nomme pas directement le Lurker. |
| Mimicry Marcus, RE0 | Texture du camouflage à distance et observations datées du comportement collectif puis de l’imitation. |
| Queen Leech, deuxième forme, RE0 | Transition après la première défaite, résistance accrue et faiblesse au soleil. |
| Crimson Head, Remake | Prévention de réanimation et **cas particulier** du cadavre du Mirror Corridor ; les deux contextes restent distincts. |
| Chimera, Remake | Composition humaine/mouche et déplacement au sol/plafond du laboratoire, sans transfert à RE1 1996. |
| Nosferatu, CODE: Veronica | Échec du prototype, récit d’un confinement et grondement entendu sous terre **sans locuteur confirmé**. |
| Napad, RE6 | Vapeur thermique, geste de thorax à l’excitation, éclosion localisée et centre nerveux sous la carapace dorsale. |
| Ubistvo, RE6 | Organes dans la **main droite**, rôle du cœur et exception des rencontres où l’organisme est invulnérable. |
| Ustanak, RE6 | Dispositif de capture au **bras droit**, prélèvement après capture, facultés mentales et machines. |
| Rasklapanje, RE6 | Corps principal protégé dans le torse, parties détachées actives et sortie du corps face à la chaleur. |
| Alexia, CODE: Veronica | Plan de quinze ans à basse température, cité comme calcul du personnage ; aucune durée d’évolution en combat déduite. |

La contrainte du Stinger reste une borne de longueur documentaire. Elle ne calibre ni la hauteur du sprite ni la collision du combat 2D. Les deux issues citées pour le centre nerveux du Napad et le cœur de l’Ubistvo concernent **le propre organisme décrit**, avec ses conditions. Elles n’admettent aucun finisher contre les autres victimes du catalogue.

Les pages de fichiers sont des **transcriptions secondaires**, pas des captures directes du jeu ni des confirmations de support ou de traduction. Les trois accès officiels Capcom essayés ont répondu 403 ; le refus est consigné sans contournement. Aucune comparaison primaire ou fidélité globale 1:1 n’est revendiquée.

## Écoute et conservation

Le lecteur met les références à côté d’une file des **218 fichiers OGG/WAV déjà livrés dans R31**, pour sept identités candidates. Ces fichiers ne sont pas recopiés ou recomptés comme médias nouveaux. La sélection ne les télécharge pas automatiquement.

« PRÉPARER LE FICHIER VÉRIFIÉ » lit au plus la taille annoncée, dans une borne de 2 Mio, et compare le SHA-256 avant de donner une URL locale au lecteur audio. La lecture reste une seconde action volontaire. Changer de fichier annule le chargement en cours ; quitter la page libère sa source et le retour ne déclenche pas de lecture. Les réponses dépassées ne remplacent pas une nouvelle sélection. La préparation du manifeste est également relançable après interruption.

Le récit de grondement du journal de CODE: Veronica ne permet pas de choisir un fichier dans la publication « Alexander », ni d’en déduire une attaque. Édition Dreamcast cible, publication CODE: Veronica X PS2, locuteur, phase, action et écoute indépendante restent des critères distincts. Aucun son n’est affecté au combat ; aucune écoute humaine indépendante n’est déclarée. Le lien vers les notes R31 conserve l’incarnation exacte.

L’export JSON du dossier contient les citations, leurs empreintes et les fichiers candidats avec leurs critères non attribués. L’outil n’écrit ni dans `localStorage` ni dans les sauvegardes du jeu. La comparaison de contexte ne modifie aucune règle, évolution ou simulation.

## Référence manquante

`re7-jack-baker-scissor` reste sans avatar admis. Le blog conservé décrit un duel de tronçonneuses ; cette mention ne prouve pas une image exacte de la phase de la morgue. Les pages Fandom ont répondu 402, le listing de modèle essayé 403 et la route Evil Resource essayée 404. Les résultats de recherche non pertinents n’ont pas été utilisés comme preuves. L’image provisoire de Jack d’une autre phase n’est pas promue.

## Recette

```sh
python3 scripts/build-evidence-r33.py --check
python3 tests/test_evidence_r33.py
node tests/verify-evidence-r33.mjs
node tests/browser-evidence-r33.mjs
```

Node 22.16, Playwright 1.64.1 et Chromium sont utilisés pour la recette navigateur ; axe-core 4.14.0 est requis. Le build du paquet est hors réseau et conserve les captures d’origine. Les rapports R33 lient les fichiers exécutés par SHA ; aucun rapport historique n’est réécrit.

Les vérifications couvrent citations, nouveauté, corps/éditions/conditions, refus d’entrées forgées, lecture réelle du HTML, décodage WAV/OGG par Chromium, export, annulation et réponses dépassées, transitions de page **synthétiques**, texte à 200 % et affichage à 320/1280 px. Le décodage automatisé ne prouve pas une écoute humaine, et les transitions synthétiques ne certifient pas un BFCache réel. Les appareils physiques et lecteurs d’écran restent hors de cette recette.
