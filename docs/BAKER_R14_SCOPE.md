# R14 — Trois intérieurs RE7, lot de décors du plan P1

Base : PR12 `c505206a06c63843533cfca046cf06544b9e1e28` (R13). Aucun changement de combat, de replay, de personnage ou de sauvegarde.

## Du plan Excel au contenu visible

La feuille `05_Stages` de `BOW_PR11_MATRICE_EXECUTION_R8.xlsx` conserve six lignes de travail par configuration : GEO, AMB, LUX, PROP, SEQ, QA. Cette passe traite les trois identifiants RE7 de 2017 :

- `baker_garage_2017` : porte sectionnelle, rails, berline inerte de fond, établi fixé au mur, outils, bidons, rangement. Ventilation, chaîne faiblement mobile, éclairages locaux et pluie limitée à l'ouverture extérieure.
- `guest_house_attic_2017` : toit en pente, charpente, fenêtre, mobilier couvert, coffre et échelle. Lampe suspendue, voilage discret, poussières intérieures et pluie derrière la fenêtre.
- `testing_area_2017` : couloir aux cadres successifs, planches, conduits, boîtiers et poste de contrôle. Moniteur au signal original, voyant lent, câble suspendu, poussières. Pas de pluie à l'intérieur, de faux personnage affiché à l'écran ou de piège générant des dégâts.

Ces trois configurations partageaient précédemment `assets/arenas/baker.png`, un hall avec escalier. Elles possèdent désormais trois compositions Canvas indépendantes, dessinées par le code. Le PNG original reste livré et sert de repli si le module manque. Le nombre d'arènes reste 52 : aucune nouvelle entrée artificielle.

## Frontière de fidélité

**Ce sont des compositions originales adaptées au duel 2D, pas des plans Capcom certifiés 1:1.** Les sources primaires consultées décrivent le cadre et l'atmosphère de RE7, mais ne valident pas chaque accessoire, le modèle de voiture, les coordonnées, l'angle de caméra ou les animations. La berline n'est pas pilotable ; les boîtiers ne sont pas des objets du système de Lucas. Les corps combattent dans le même espace de simulation plat, devant le décor.

Sources consultées le 20 octobre 2026 :
- Capcom, sortie du jeu et maison délabrée de Dulvey : https://news.capcomusa.com/lets/browse/the-family-is-waiting-for-you-resident-evil-7-biohazard-is-available-now
- Capcom, extrait de cassette et distinction entre bande-annonce et jeu : https://news.capcomusa.com/capkel/blog/2016/08/17/new-found-footage-surfaces-for-resident-evil-7-biohazard
- Capcom, galerie des concepts : https://game.capcom.com/residentevil/en/news_topics-201702211000.html

Aucun concept verrouillé de cette galerie n'est extrait. Aucun timecode, screenshot original de ces trois salles ou métrique de niveau n'a été inventé. Les lignes GEO et leur revue artistique restent ouvertes. Les animations ambiantes sont originales et passives, non des répliques mesurées de leurs mouvements officiels.

## Intégration

Même renderer pour miniatures, Dossiers, Versus principal, essais, laboratoires et ateliers. Il charge la composition R14 par son identifiant exact sans accès réseau. Une callback tardive de l'ancienne miniature ne doit pas remplacer une pièce déjà passée au rendu procédural.

Le temps vient exclusivement de l'appelant. La pause et la relecture à une frame identique redonnent les mêmes pixels. Aucun appel de hasard du jeu, son, minuteur, stockage, collision, dégâts ni écriture sur les acteurs. Les trois contrats de replay/journal restent octet pour octet identiques à R13.

L'atelier des stages propose cinq vues (ensemble, architecture seule, architecture+objets, architecture+lumières, architecture+ambiance), un compteur éditable borné, l'avance d'une frame et un lien qui retrouve la salle/couche/frame en pause. Le mode réduit fige les animations, pas la présence de la salle. Les anciens 49 décors ne sont pas renommés R14.

## Preuves et limites

`tests/verify-baker-stages-r14.mjs` : 20 groupes ciblés (pixels, calques, horloges, reprise, surface au sol, contexte Canvas, absence de mutations, interfaces et trois duels CPU complets). `tests/browser-baker-r14.mjs` : huit scénarios HTTP Chromium, 1440/390 pixels. Les résultats générés font autorité ; le texte préparatoire ne signifie pas que les tests sont déjà réussis.

Le navigateur local a refusé l'URL localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`) et npm local a rencontré une erreur DNS. Aucun contournement de politique. Les runners habituels GitHub font les vérifications dans leur propre environnement. Les captures natives et navigateur sont des preuves du code rendu, pas une attestation de fidélité aux jeux originaux, de tous les appareils ou du BFCache réel.

L'Excel `docs/planning/BOW_STAGES_BAKER_R14.xlsx` relie les 18 IDs P1 concernés aux compositions, animations, sources et contrôles. Les anciens classeurs restent inchangés. Les closures portent sur la réalisation de cette adaptation et ses contrôles ; pas sur un lot global P1 ni sur une géométrie 1:1.

Pas de fusion main, de promotion Vercel ni de nouveau transfert Google Drive automatique.
