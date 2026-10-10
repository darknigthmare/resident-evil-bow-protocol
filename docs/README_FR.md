# Guide complet — Resident Evil : B.O.W. Protocol 0.2.0

## Présentation

B.O.W. Protocol est un jeu de combat 2D de fans basé sur le moteur CQC Versus Legacy v0.60. La version 0.2.0 transforme le prototype en véritable archive de confinement Resident Evil : menu survival-horror, états vitaux, Bestiaire, Dossiers, Opérations et 750 techniques traçables.

Le contenu jouable comprend 75 incarnations précises. Une incarnation est une combinaison volontairement fermée : **créature + forme + jeu/version**. Les capacités d’une autre phase ou d’un autre remake ne sont pas importées sans preuve.

## Choisir son mode

**Versus** : duel contre l’IA ou à deux joueurs sur le même appareil. Sélection du sujet, de l’arène, du nombre de manches, du chronomètre et du mode de conclusion.

**Dossiers** : campagne de huit rencontres propre à chacun des 75 sujets. Introduction, rapports intermédiaires, conclusion, journal, favoris et sauvegarde locale.

**Arcade** : huit combats, vie réinitialisée à chaque rencontre.

**Survie** : la vie restante est conservée ; 12 % de la vie maximale sont restaurés entre deux victoires, sans dépasser le maximum.

**Boss Rush** : route de dix sujets classés boss dans le roster disponible.

**Laboratoire** : entraînement CQC avec mannequin, garde, garde après impact, CPU, collisions, récupération, ressources libres et exercices guidés.

**Bestiaire** : 389 entrées documentaires. Les 75 sujets jouables sont marqués « rendu en pied / moveset 10 sur 10 audité ».

**Archive des movesets** : consultation complète des dix commandes de chaque sujet, avec preuve, justification, valeurs de simulation, contre-jeu et sources.

## Commandes clavier

| Action | P1 | P2 |
|---|---|---|
| Gauche / droite | Flèches | A / D |
| Saut / accroupi | Haut / bas | W / S |
| Léger / lourd | J / K | F / G |
| Frappe basse | Bas + J | S + F |
| Technique | I ; bas, avant ou arrière + I | T ; bas, avant ou arrière + T |
| Prise | U | R |
| Super / conclusion | O | Y |
| Utilitaire biologique | L | H |
| Garde | Espace | Q |
| Dash | Majuscule droite | E |
| Techniques / conclusions | F1 / F2 | — |

Les touches suivent les positions QWERTY. Sur un clavier AZERTY, les directions du joueur 2 sont Q / D / Z / S et sa garde est A.

« Avant » et « arrière » dépendent de la position de l’adversaire. L’utilitaire change selon le sujet : marquage, camouflage, régénération, récupération, posture ou autre fonction décrite dans son dossier.

## Manette et tactile

A/✕ : léger ; B/○ : lourd ; X/□ : technique ; Y/△ : prise ; LB/L1 : garde ; RB/R1 : dash ; LT/L2 : ressource ; RT/R2 : super ou finisher. Les commandes tactiles apparaissent sur les écrans compatibles.

## Lire un moveset

Chaque sujet possède les dix emplacements suivants : léger, lourd, bas, prise, spécial neutre, spécial bas, spécial avant, spécial arrière, super et utilitaire.

Chaque technique affiche :

- son nom propre à l’incarnation ;
- son niveau de preuve ;
- sa base lore ou anatomique ;
- la frontière entre la référence et l’adaptation ;
- son démarrage, son activité, sa récupération, ses dégâts et son coût ;
- une réponse ou punition recommandée ;
- au moins une URL de référence.

### Niveaux de preuve

**Canonique — 537 techniques.** L’action ou le comportement est documenté pour la forme indiquée. Les frames, portées, dégâts et commandes restent une adaptation.

**Anatomique — 150 techniques.** Le mouvement exploite une partie du corps ou une locomotion visible. Il ne crée pas de nouveau pouvoir biologique.

**Simulation — 63 techniques.** Le moteur a besoin d’une retraite, d’une gestion de ressource ou d’une action comparable ; elle est affichée comme gameplay non canonique.

Total : **750 techniques / 75 signatures complètes distinctes**.

## Exemples de cloisonnement des formes

- Nemesis 2020 forme 1 conserve son arsenal et son tentacule ; il ne reçoit pas automatiquement les capacités de ses formes quadrupède ou finale.
- Le Tyrant T-002 reste distinct du Tyrant de Resident Evil 2 et de leurs mutations.
- Chaque stade de William Birkin est traité comme une incarnation différente lorsqu’il possède une fiche jouable.
- Les personnages humains mutés, les formes exposées et les formes finales ne sont pas fusionnés silencieusement.
- Les versions originales et remakes peuvent avoir des comportements, silhouettes et sources séparés.

## Interface et états vitaux

Le HUD emploie trois états :

- **FINE** : plus de 60 % de vie ;
- **CAUTION** : de 35 % à 60 % ;
- **DANGER** : 35 % ou moins.

L’ECG, la couleur de la jauge et les panneaux de statut suivent cet état. Le thème utilise un langage de terminal de confinement : noir industriel, rouge d’alerte, vert médical, ambre, scanlines, dossiers et marquages de sécurité.

## Sauvegardes et replays

Les sauvegardes B.O.W. Protocol sont séparées de celles de CQC. Les Dossiers utilisent trois emplacements, des copies de secours, l’export et l’import JSON. Les replays stockent les entrées et la configuration ; ils ne sont pas des vidéos.

Un changement d’appareil ou de navigateur ne transfère pas automatiquement les données. Utiliser l’export puis l’import depuis les Options.

## Fidélité : portée exacte

La version 0.2.0 vise une fidélité maximale pour l’identité, l’anatomie, l’agent biologique, les capacités et les comportements de chaque incarnation. Elle ne prétend pas extraire ou reproduire les animations internes des jeux Resident Evil.

Les éléments suivants sont des choix de simulation :

- commandes et disposition des boutons ;
- nombre de frames, dégâts, portée et coût ;
- hitboxes, collisions et échelle commune de l’arène ;
- enchaînements entre coups ;
- affrontements entre époques ou épisodes ;
- Dossiers, Arcade, Boss Rush et Survie ;
- conclusions stylisées.

Cette frontière apparaît dans chaque fiche. Les documents `AUDIT_LORE_V020.md` et `MOVESETS_COMPLETS_V020.md` fournissent la traçabilité intégrale.

## Développement et tests

```sh
npm start
npm run verify
npm run build
```

`npm run verify` exécute l’audit lore, les 26 contrôles du moteur, les 20 contrôles de pages et les 10 contrôles d’interface. `npm run build` vérifie les ressources puis construit le site dans `dist/`.

Le test Canvas utilise une dépendance native uniquement pour la validation. Le jeu déployé reste entièrement statique et ne dépend pas de cette bibliothèque.

## Organisation

- `data/` : profils éditables, lore, roster, histoires et sources ;
- `src/` : moteur, rendu, navigation et données compilées ;
- `styles/` : thème et mises en page ;
- `modules/` : Versus et Dossiers ;
- `assets/` : spécimens, portraits et arènes ;
- `tests/` : audits et scénarios de validation ;
- `docs/` : guide, rapports et traçabilité.

## Crédits

Projet de fans non officiel. Resident Evil / Biohazard et ses éléments appartiennent à leurs ayants droit, dont Capcom. Le moteur d’origine provient du projet CQC Versus Legacy de Darknigthmare. Les références des images et fiches sont conservées dans les données du projet.
