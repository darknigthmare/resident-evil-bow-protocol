# Resident Evil — B.O.W. Protocol

Jeu de combat 2D de fans construit à partir du moteur **CQC Versus Legacy v0.60** de Darknigthmare, avec un roster, une progression, une interface et des données Resident Evil indépendants.

**Version 0.2.0 — Lore Audit, 10 octobre 2026.** Cette version reconstruit le répertoire des 75 sujets jouables autour de leur **incarnation exacte**, ajoute une traçabilité par mouvement et remplace l’habillage générique par une interface de confinement survival-horror originale, cohérente avec le thème Resident Evil sans recopier les menus d’un jeu commercial.

## Contenu 0.2.0

- **75 B.O.W., mutants et antagonistes jouables**, chacun limité à l’épisode et à la forme indiqués.
- **750 techniques**, soit dix commandes par sujet.
- **537 techniques canoniques**, reliées à une action ou un comportement documenté.
- **150 extensions anatomiques**, fondées sur la morphologie visible sans ajouter un pouvoir étranger.
- **63 traductions de simulation**, nécessaires au jeu de combat et explicitement signalées comme non canoniques.
- **75 signatures de moveset distinctes** : aucun sujet ne reprend intégralement le répertoire d’un autre.
- **75 Dossiers de confinement** de huit rencontres, soit 600 étapes.
- **300 conclusions de duel**, **389 fiches de Bestiaire** et **18 configurations d’arène**.

L’[Archive des movesets](movesets.html) permet de consulter les 750 techniques avec commande, niveau de preuve, justification, valeurs de simulation, contre-jeu et sources.

## Jouer

Ouvrir l’adresse indiquée dans `docs/deployment.json`, ou lancer le serveur local avec **Node.js 20 ou ultérieur** :

```sh
npm start
```

Puis ouvrir `http://localhost:5173`. Aucune dépendance n’est nécessaire pour jouer. Les lanceurs `LANCER_WINDOWS.bat` et `LANCER_MAC_LINUX.sh` sont inclus.

Le menu donne accès au Versus, aux Dossiers, à l’Arcade, à la Survie, au Boss Rush, au Laboratoire, au Bestiaire et à l’Archive des movesets.

## Commandes

| Action | Joueur 1 | Joueur 2 |
|---|---|---|
| Déplacement, saut, accroupi | Flèches | W A S D |
| Coup léger / lourd | J / K | F / G |
| Coup bas | ↓ + J | S + F |
| Technique neutre / directionnelle | I + direction | T + direction |
| Prise | U | R |
| Super / finisher | O | Y |
| Utilitaire propre au sujet | L | H |
| Garde | Espace | Q |
| Dash | Majuscule droite | E |

Les commandes correspondent aux positions physiques QWERTY. Sur AZERTY, les déplacements du joueur 2 correspondent à Q / D / Z / S et sa garde à A. Manettes standard et commandes tactiles sont prises en charge. F1 ouvre le dossier des techniques ; F2 ouvre les conclusions.

## Portée de la fidélité « 1:1 »

La fidélité porte sur l’incarnation, l’épisode, la forme, l’agent biologique, l’anatomie, les familles d’attaque et les comportements documentés. Les formes sont cloisonnées : une créature ne reçoit pas silencieusement les pouvoirs d’une autre mutation, phase ou version.

La livraison ne prétend pas extraire ou reproduire les animations, hitboxes, frames ou valeurs internes des jeux Capcom. Les commandes, timings, dégâts, ressources, collisions, enchaînements, campagnes, affrontements entre époques et finishers sont des adaptations originales du moteur 2D. Cette frontière est visible dans le Bestiaire, le Laboratoire et l’Archive des movesets.

Les niveaux de preuve sont :

- **Canonique** : action ou comportement documenté pour cette incarnation ; seules les valeurs de duel sont adaptées.
- **Anatomique** : extension prudente de la morphologie ou de la locomotion visibles, sans nouveau pouvoir.
- **Simulation** : fonction nécessaire au jeu de combat, explicitement non présentée comme canonique.

Le détail complet figure dans [`docs/AUDIT_LORE_V020.md`](docs/AUDIT_LORE_V020.md) et [`docs/MOVESETS_COMPLETS_V020.md`](docs/MOVESETS_COMPLETS_V020.md).

## Interface Resident Evil

La version 0.2.0 introduit sur les écrans principaux :

- noir industriel, rouge d’alerte, vert vital et ambre de précaution ;
- terminaux, dossiers, bandes de danger, scanlines et sceaux de traçabilité ;
- états de santé **FINE**, **CAUTION** et **DANGER** avec lecture ECG en combat ;
- badges de preuve pour chaque technique ;
- affichage de l’agent biologique, du passif, de la ressource et du nombre d’actions canoniques ;
- menus plein écran adaptés au Versus, aux Dossiers, aux Opérations et au Bestiaire.

Cette direction artistique est une création originale pour le fangame.

## Développement, compilation et validation

Le contenu éditable se trouve dans `data/`. Pour régénérer le contrat lore et les données navigateur :

```sh
python3 scripts/build-lore-movesets.py
python3 scripts/compile-content.py
```

Pour valider et construire :

```sh
npm run verify
npm run build
```

La validation comprend :

- l’audit exhaustif des 75 profils et 750 mouvements ;
- **26/26** contrôles du moteur, de l’IA, des ressources, statuts, replays et Dossiers ;
- **20/20** contrôles des pages Bestiaire et Opérations reliées au moteur ;
- **12/12** contrôles d’interface, de navigation, de traçabilité et de l’Archive des movesets.

Total : **58/58 contrôles exécutables réussis**, en plus de l’audit exhaustif des données. Les rapports sont dans `docs/verification-runtime.md`, `docs/verification-pages.md`, `docs/verification-ui.md` et `docs/VERIFICATION_FR.md`.

## Sources, crédits et statut

Resident Evil / Biohazard, ses personnages, créatures et lieux appartiennent à leurs ayants droit, dont Capcom. Projet de fans non officiel. Les URL de référence et la provenance des ressources sont conservées dans les données et dans `data/asset-sources.json`.

Le code de base reste attribué au projet CQC Versus Legacy de Darknigthmare. La transposition et les empreintes sont documentées dans `docs/source-provenance.json`. Aucune licence générale sur les ressources Resident Evil n’est accordée par ce dépôt.
