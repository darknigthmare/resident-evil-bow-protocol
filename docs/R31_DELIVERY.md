# R31 — Tous les chantiers ouverts répartis en lots

Les 17 chantiers du [classeur R31](BOW_FIDELITE_R31.xlsx) ont un responsable et des preuves consultables. Les sept lots ont livré un avancement dans leur périmètre ; les critères encore sans preuve gardent leur état ouvert. Le classeur contient 63 feuilles, avec les 56 feuilles R30 et leurs relations conservées exactement.

| Lot | Chantiers | Livraison concrète |
| --- | --- | --- |
| Sprites | R20-10, G-RENDU | Trois PNG réellement générés, deux présentations frontales révisées et une variante Zombie 2002 volontaire en pose droite fixe ; une nouvelle archive native et quatre vues de référence. |
| Mouvements et commandes | R20-09, G-COMMANDES, G-CINEMATIQUES, G-MANCHES | Huit clips natifs complets, 2 016 images à60Hz et 248 images d’inspection supplémentaires ; audit des 389 identités et 3 460 commandes adaptées, avec235liens documentaires. |
| Canonique | G-PERIMETRE, G-PREUVES, G-ECHELLE, G-VICTIMES | Vingt faits nouveaux issus de29réponses sources, trois contraintes dimensionnelles par phase, six règles de conclusion et quatre décisions d’alias ou d’édition conservées comme non résolues. |
| Sauvegardes et replays | G-REPLAYS, G-SAUVES | Restauration des18clés réelles reconnues par R19, journal avant écriture, reprise/retour après rechargement ; replays R28 lus dans leurs moteurs sources vérifiés et isolés. |
| Audio | G-AUDIO | Quatre archives conservées,218fichiers OGG/WAV et216mesures PCM distinctes ; lecteur volontaire et notes d’écoute exportables, avec sept identités candidates. |
| Performance et accès | G-PERF, G-ACCESS | Budget partagé pour les trois lecteurs d’images, reprise après éviction, mesure volontaire d’une session et bilan textuel des vrais acteurs dans le dialogue de pause existant. |
| Suivi et recette | G-RECETTE, G-LIVRAISON | Attribution des17chantiers,436objets de preuve ou d’audit liés aux identités,448lignes de source, export reproduit exactement et recettes par lot. |

Le [suivi central](../modules/fidelity-r31/index.html) permet de filtrer par lot. Les Dossiers exposent les ajouts de chaque identité ; l’audit global des commandes ne devient pas un nouveau média ou un corps entier.

## Utiliser les ajouts

La [galerie des illustrations](../modules/fidelity-r31/sprites/index.html) distingue Lucas muté, Donna/Angie et le Zombie nu de l’édition GameCube2002. La variante Zombie se choisit volontairement, dans la page courante. Une seule orientation et une image sont produites ; il s’agit d’une pose statique adaptée, sans animation originale revendiquée. La fine pointe supérieure de Lucas garde une réserve explicite sur sa marge et son alpha faible. Les22refus initiaux et le refus de révision Tyrant sont conservés.

Le [lecteur de mouvements](../modules/fidelity-r31/motion/index.html) garde les caméras fixes et les trajectoires natives. Deux scènes à forte translation proposent aussi une inspection où seule la caméra suit la vraie racine. Les gestes observés ne sont pas promus automatiquement en attaques, intros, outros ou KO originaux. Le [répertoire des commandes](../modules/fidelity-r31/commands/index.html) sépare commandes adaptées, descriptions documentaires et mouvements observés.

Le lien ajouté au [centre de sauvegardes](../saves.html) ouvre la restauration avec aperçu, copie préalable et confirmation explicites. Le journal de reprise conserve les valeurs avant/après avant de toucher les clés du jeu ; il protège aussi les modifications intervenues dans un autre onglet. Il ne rend pas les écritures de plusieurs clés atomiques et ne configure aucun service cloud.

Le [lecteur audio](../modules/fidelity-r31/audio/index.html) permet de préparer puis écouter une source et de conserver ses notes. Les218fichiers ne constituent pas218actions attribuées : édition, phase, locuteur et écoute indépendante restent séparés. Aucun son n’est affecté automatiquement au combat.

Dans les trois pages de combat actuelles, « BILAN DU COMBAT » ouvre le dialogue existant avec les vies, ressources, furie, manches et raisons des évolutions. Les annonces sont demandées par le joueur. Le [relevé de session](../modules/fidelity-r31/performance/index.html) observe volontairement les callbacks du navigateur ; il ne certifie ni un affichage physique à60images/s ni la mémoire totale du GPU. Les trois lecteurs coordonnés réservent au plus33554432pixels, décodages en cours compris ; les autres allocations restent hors de cette mesure.

## Recette et limites

Les [22rapports indépendants](R31_VALIDATION.json) couvrent65tests Python,77groupes Node,57groupes navigateur et cinq contrôles des définitions CI. Les [neuf groupes d’intégration](R31_INTEGRATION_TESTS.json), les [assertions historiques](R31_HISTORICAL_TESTS.json), le [build comparé](R31_BUILD.json) et la [conservation du dépôt](R31_SOURCE_ADDITIONS.json) complètent ces preuves après l’export. La [reproduction du classeur](R31_REPRODUCTION.json) passe trois contrôles sur trois.

Les [deux défauts CI de R30 reproduits](R31_CI_RECOVERY.md) sont corrigés dans les workflows : ordre d’une preuve native et de son consommateur, vrai rapport des tests d’export, et source publiée des anciennes assertions de canvas R20. Les assertions historiques restent inchangées ; les montages courants ont leurs propres tests R31. Les exécutions historiques ne sont pas recomptées comme de nouveaux tests R31.

La fidélité globale1:1, les idles originaux de toutes les incarnations, les intros/outros authentifiées, l’écoute indépendante, les conclusions artistiques, les mesures physiques et les appareils cibles restent ouverts. Les trois illustrations sont générées et les nouveaux rendus animés sont des dérivations de sources natives ; ils ne certifient pas les pixels du moteur d’origine.
