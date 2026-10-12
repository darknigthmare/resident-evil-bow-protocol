# B.O.W. Protocol v0.7.0 — Annexe du catalogue

## Couverture documentaire
Les **274 entrées auparavant sommaires** du catalogue existant disposent désormais d’une fiche enrichie : incarnation, agent quand établi, morphologie, comportement, limites, références et travail visuel restant. Les descriptions figurent aussi dans le Bestiaire principal et les données éditables. Le catalogue global compte toujours **389 entrées** ; il ne couvre pas toute la franchise.

**239 références descriptives** et **35 pages de référence sans description suffisante** sont distinguées. L’historique de lecture conserve seulement URL, date, statut HTTP et empreinte, sans redistribuer les paragraphes aspirés.

## Essais accessibles
- **231 prototypes de combat**, avec dix commandes chacun, soit **2 310 commandes expérimentales**.
- Les commandes réutilisent des modèles de familles techniques ; ce ne sont pas 231 movesets originaux reconstruits intégralement. Toutes les nouvelles commandes sont classées **simulation**.
- `catalog-laboratory.html` permet de déclencher chaque commande dans le moteur CQC.
- `catalog-duel.html` permet clavier/tactile et IA contre IA, avec ressources, collisions et KO réels du prototype, sans progression ni sauvegarde.
- **43 rencontres contextuelles** (plantes, eau, essaims, cocon, véhicule, poursuite, explosion, phases et sentinelles) possèdent un dossier et un exercice abstrait déterministe dans `catalog-encounter.html`. Ce n’est pas une reconstitution du niveau ou du boss original.
- Les exercices respectent des séparations minimales : cocon sans attaque, explosion consommant l’organisme, UV seulement pour The Girl, fuite sans mort canonique d’un poursuivant.

## Conservation de la version précédente
Les **115 combattants de progression**, leurs **1 150 commandes**, **115 Dossiers / 920 rencontres** et **460 conclusions stylisées** restent inchangés. L’annexe est isolée pour ne pas contaminer les sauvegardes, replays, récompenses et itinéraires. Le moteur de combat reçoit seulement une bannière de version mise à jour, pas un nouveau réglage des combattants de base.

## Navigation
`catalog.html` : recherche, filtres par épisode/type/niveau de documentation, fiches et liens vers les essais. Accès depuis l’accueil, le Bestiaire et le registre de couverture. Le terme « hors progression » reste distinct de « prototype disponible ».

## QA réellement exécutée
**113 contrôles exécutables réussis**, sans échec, plus dix vues/interactions Chromium hors ligne en 1440 et 390 pixels. Les 2 310 démarrages de commandes ont été activés dans le moteur. **231 duels CPU à pleine santé initiale sont terminés par KO** dans l’échantillon déterministe. Cela ne certifie pas l’équilibre de tous les matchups ni toutes les positions.

Les essais Chromium utilisent des fichiers locaux injectés et des assets servis en mémoire : ils ne certifient pas un déploiement HTTP public, les iframes réseau ou un téléphone physique.

## Fidélité : limites encore ouvertes
Les références restent des portraits provisoires, parfois tronqués. **Aucune nouvelle animation définitive 1:1 n’est livrée.** Les variantes, points faibles spatiaux, phases complètes et 35 sources sommaires nécessitent encore une validation approfondie. Les exercices contextuels utilisent des jauges et conditions de réussite originales, jamais présentées comme des événements canoniques.

La release GitHub et son build sont indépendants de la promotion Vercel. Lire le rapport de livraison daté pour connaître l’état de l’URL publique.
