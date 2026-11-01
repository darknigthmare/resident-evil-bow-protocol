# R33 — Sprites, sources et chantiers parallèles

Les 17 chantiers ouverts sont répartis entre six lots responsables. Le [classeur R33](BOW_FIDELITE_R33.xlsx) contient 70 feuilles : les 63 feuilles R31 et leurs relations sont conservées exactement, sept feuilles suivent les ajouts R33. Les 389 identités restent séparées entre combattants, prototypes et contextes. Vingt-sept identités ont un ajout lié, pour 44 objets de preuve ou d’audit au total ; ce ne sont pas 27 combattants nouvellement terminés.

| Lot | Livraison vérifiée |
| --- | --- |
| Sprites | Huit PNG réellement générés pour quatre familles GameCube, avec gauche/droite produits séparément. Zombie Dog RE2 et Zombie RE3 blonde ont une pose adaptée volontaire ; Alligator reste contextuel et Moth documentaire. |
| Natif et mouvements | Trois identités supplémentaires, quatre variantes de corps, 16 vues et six clips complets nouveaux : 1 270 images à 60 Hz, douze extrémités et 58 atlas. La bibliothèque passe de 50 à 53 identités. |
| Sources | Treize incarnations documentées, 35 extraits structurés et 20 sources factuelles conservées. La comparaison distingue phase, anatomie, édition, conditions et conclusions ; les 218 sons R31 sont réutilisés pour préparer une écoute, sans nouvelle attribution. |
| Sauvegardes et replays | Reprise/retour limités aux groupes choisis, avec progrès extérieurs conservés et conflits choisis toujours bloqués. Journaux R31 compatibles ; lots de 16 fichiers au maximum lus dans quatre routes de moteurs originaux. |
| Présentation et accès | Trois montages de combat intégrés, trois portraits natifs recadrés sans modifier les PNG, choix d’édition/orientation, crédits de décodage coordonnés, commandes clavier et texte doublé vérifiés. |
| Suivi et recette | Six responsables, 17 chantiers toujours ouverts, 95 lignes de source, 18 rapports courants et export reproductible à l’identique. Les nouveaux détails d’audit des Dossiers sont réservés au mode DEV. |

## Choisir les présentations

Le [mode avec évolutions](../modules/fidelity-r33/evolutions/index.html) conserve les familles et transformations volontaires R28, ainsi que les corrections de commandes R32. Les liens du Versus principal et du duel catalogue ouvrent ce montage. Les moteurs, règles, identifiants et contrats de replay ne sont pas réécrits.

Dans les trois modes actuels, les deux familles de poses générées se choisissent explicitement dans « VARIANTES VISUELLES DE L’INCARNATION ». Leur édition GameCube reste affichée ; aucune équivalence PlayStation n’est admise par défaut. Le côté demandé est réellement chargé, sans miroir. Les attaques et autres états non produits gardent leur présentation disponible. La [galerie](../modules/fidelity-r33/sprites/index.html) conserve aussi les deux familles documentaires et leurs références.

Une boucle marine Sea Creeper est disponible comme variante volontaire. Elle réutilise 300 images R30, deux orientations à 60 Hz sur la durée native, avec réduction des mouvements respectée. Le menu l’annonce comme « boucle aquatique observée » : aucun appui terrestre ou idle original certifié n’est revendiqué. Les six autres clips nouveaux restent des mouvements sources observés, sans attribution automatique d’attaque, d’intro, d’outro ou de KO.

Les nouvelles poses natives en T restent hors admission au combat. Les modèles RE5 conservent leurs équipements absents et matériaux non qualifiés comme limites. Trois portraits de sélection emploient seulement leurs vues inspectées de tête/haut du corps. L’avatar exact Jack à scie à ciseaux reste manquant ; les recherches non concluantes sont documentées sans substitution d’une autre phase.

Le [centre de sauvegardes](../saves.html) propose les liens R33 vers la restauration ciblée et les lots de replays, en conservant ses fonctions R19 et son ancien accès R31. Aucun outil ne restaure ou ne lit un fichier sans action du joueur. Les écritures de plusieurs clés ne sont pas atomiques et aucun service cloud n’est configuré.

## Preuves et limites

La [recette R33](R33_VALIDATION.json) regroupe **57 tests Python, 49 groupes Node et 56 groupes navigateur**, plus **39 contrôles de garde et six contrôles des définitions CI**. Les 40 cas de garde R32 sont exécutés intacts et comptés séparément. Les [neuf contrôles d’intégration](R33_INTEGRATION_TESTS.json) et la [reproduction du classeur](R33_REPRODUCTION.json), trois sur trois, complètent cet ensemble après export.

Les [sept recettes navigateur R31](R33_R31_BROWSER.json) passent leurs 57 groupes sur le checkout actuel, avec leurs anciens rapports restaurés exactement. Les [neuf recettes R32](R33_R32_BROWSER.json) passent 98 groupes et rejouent séparément les 16 groupes R28 existants. Ces régressions ne sont pas recomptées comme de nouvelles preuves artistiques R33. Les [copies exactes des résultats et journaux](R33_BROWSER_EVIDENCE_RETENTION.json) rendent leurs sorties fraîches consultables sans réécrire les archives.

La [vérification générale isolée](R33_CURRENT_TESTS.json) a exécuté `npm run verify` avec sortie 0 : 572 groupes originaux sur les sources courantes, sept groupes d’entrée R32, 39 nouveaux cas de garde et 40 cas R32 conservés. Les deux suites de conservation R31 passent séparément leurs 33 groupes sur leur archive publiée. Les 605 anciens groupes correspondent donc à 572 courants et 33 publiés ; ils ne constituent pas 605 nouvelles preuves R33. Les 1 524 empreintes du checkpoint restent identiques après l’exécution.

Le [build comparé](R33_BUILD.json) conserve les 1 468 fichiers du module R33, soit 92 207 837 octets, les quatre montages et le classeur. Le [registre des ajouts](R33_SOURCE_ADDITIONS.json) et le [contrôle de l’index Git](R33_STAGED_CONSERVATION.json) protègent les sept modifications historiques autorisées et tous les nouveaux octets du module.

La [contre-revue visuelle](R33_SPRITES_INDEPENDENT_REVIEW.json) a réellement inspecté les huit PNG et seize références. Aucun défaut anatomique bloquant ou extrémité principale visiblement coupée n’a été observé ; des contours/halos ajoutés et des textures reconstruites restent des écarts visibles. Les illustrations ne certifient pas les texels ou l’éclairage d’origine.

Le budget R31 couvre seulement les lecteurs d’images participants, décodages compris. La recette mesure leur reprise après une réservation synthétique de 32 MP ; la mémoire totale du navigateur/GPU et la cadence d’un écran physique restent inconnues. Les tests clavier et axe ne certifient pas des manettes physiques ou des lecteurs d’écran réels.

**Aucun nouvel idle original certifié, aucune fidélité globale 1:1 certifiée.** Les éditions et actions non prouvées, les armes absentes, l’écoute indépendante et les états complets de combat restent ouverts. Les 22 refus de génération initiaux et le refus de révision Tyrant sont conservés sans nouvel essai. Aucun déploiement ou résultat distant R33 n’est anticipé par les preuves locales.
