# Resident Evil — B.O.W. Protocol

Jeu de combat 2D de fans construit à partir du moteur **CQC Versus Legacy v0.60** de Darknigthmare, avec un roster, une progression, une interface et des données Resident Evil indépendants.

**Version 0.3.0 — Incident Baker, 11 octobre 2026.** Cette version porte le roster à **81 incarnations jouables** et transforme six dossiers de *Resident Evil 7 biohazard* en combattants complets, sans fusionner leurs phases ni importer des capacités d’une autre mutation.

## Contenu 0.3.0

- **81 B.O.W., mutants et antagonistes jouables**, chacun limité à l’épisode et à la forme indiqués.
- **810 techniques**, soit dix commandes par sujet.
- **577 techniques canoniques**, reliées à une action ou un comportement documenté.
- **165 extensions anatomiques**, fondées sur la morphologie visible sans ajouter un pouvoir étranger.
- **68 traductions de simulation**, nécessaires au jeu de combat et explicitement signalées comme non canoniques.
- **81 signatures complètes distinctes** : aucun sujet ne reprend intégralement le répertoire d’un autre.
- **81 Dossiers de confinement** de huit rencontres, soit **648 essais**.
- **324 conclusions de duel**, **389 fiches de Bestiaire** et **18 configurations d’arène**.

L’[Archive des movesets](movesets.html) permet de consulter les 810 techniques avec commande, niveau de preuve, justification, valeurs de simulation, contre-jeu et sources.

## Incident Baker

| Sujet jouable | Incarnation | Agent | Rôle tactique |
|---|---|---|---|
| JACK BAKER — FORME MUTÉE | Resident Evil 7 biohazard (2017) | Moisissure / E-001 | COLOSSE MULTI-OCULAIRE |
| JACK BAKER — SWAMP MAN | Resident Evil 7 biohazard — End of Zoe (2017) | Moisissure / E-001 | POURSUITE RÉGÉNÉRATIVE |
| MARGUERITE BAKER — FORME MUTÉE | Resident Evil 7 biohazard (2017) | Moisissure / E-001 | EMBUSCADE INSECTOÏDE |
| LUCAS BAKER — FORME MUTÉE | Resident Evil 7 biohazard — Not a Hero (2017) | Moisissure / E-001 | CONTAMINATION FONGIQUE |
| EVELINE — FORME FINALE | Resident Evil 7 biohazard (2017) | Moisissure / E-001 | COLONIE TERMINALE |
| FUMER (WM-002) | Resident Evil 7 biohazard — Not a Hero (2017) | Moisissure blanche / WM-002 | RÉGÉNÉRATION BLANCHE |

Ces six profils possèdent chacun un sprite en pied, dix techniques écrites pour la phase concernée, quatre conclusions stylisées et un Dossier de huit essais. Les mutations de Jack, Marguerite, Lucas et Eveline restent séparées de leurs autres états.

## Jouer

- Production : <https://resident-evil-bow-protocol.vercel.app/>
- Dépôt : <https://github.com/darknigthmare/resident-evil-bow-protocol>
- Drive : voir `docs/deployment.json`.

Pour lancer localement avec **Node.js 20 ou ultérieur** :

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

Le détail complet figure dans [`docs/AUDIT_LORE_V030.md`](docs/AUDIT_LORE_V030.md) et [`docs/MOVESETS_COMPLETS_V030.md`](docs/MOVESETS_COMPLETS_V030.md).

## Interface Resident Evil

La version 0.3.0 unifie les écrans autour d’un terminal de confinement original : noir industriel, rouge d’alerte, vert vital, ambre de précaution, scanlines, dossiers biologiques et états **FINE / CAUTION / DANGER**. L’accueil comprend désormais le panneau **Incident Baker**, alimenté directement par les données du roster.

Cette direction artistique est une création originale pour le fangame ; elle ne recopie pas l’interface ou les ressources d’un titre commercial.

## Développement, compilation et validation

Le contenu éditable se trouve dans `data/`. Pour régénérer le contrat lore et les données navigateur :

```sh
python3 scripts/apply-v030-re7-bosses.py
python3 scripts/build-lore-movesets.py
python3 scripts/compile-content.py
python3 scripts/generate-v030-docs.py
```

Pour valider et construire :

```sh
npm run verify
npm run build
```

La validation actuelle comprend :

- l’audit exhaustif des **81 profils et 810 mouvements** ;
- **26/26** contrôles moteur, IA, ressources, statuts, replays, images et Dossiers ;
- **20/20** contrôles Bestiaire et Opérations reliés au moteur ;
- **13/13** contrôles d’interface, navigation et initialisation DOM réelle.

Total : **59/59 contrôles exécutables réussis**, en plus de l’audit exhaustif des données. GitHub Actions réexécute ces contrôles sur chaque push et chaque pull request.

## Sources, crédits et statut

Resident Evil / Biohazard, ses personnages, créatures et lieux appartiennent à leurs ayants droit, dont Capcom. Projet de fans non officiel. Les URL de référence et la provenance des ressources sont conservées dans les données et dans `data/asset-sources.json`.

Le code de base reste attribué au projet CQC Versus Legacy de Darknigthmare. La transposition et les empreintes sont documentées dans `docs/source-provenance.json`. Aucune licence générale sur les ressources Resident Evil n’est accordée par ce dépôt.
