# Resident Evil — B.O.W. Protocol

## v0.7.0 — Annexe du catalogue

Fangame non officiel, moteur CQC Versus Legacy v0.60.

**274 fiches enrichies, 231 prototypes de combat, 43 exercices contextuels.** Les 115 combattants de progression précédents sont conservés. Les nouvelles commandes sont des simulations de familles techniques, pas des movesets complets Capcom certifiés. Aucune nouvelle animation finale 1:1 n’est revendiquée.

### Lancer
```sh
npm start
```
Ouvrir l’adresse locale affichée. Les lanceurs Windows/macOS/Linux précédents sont conservés.

### Accès aux nouveautés
- `catalog.html` : les 274 fiches, avec recherche et filtres.
- `catalog-laboratory.html` : démarrage réel des techniques, pause et pas de simulation.
- `catalog-duel.html` : duels d’essai avec clavier/tactile ou IA contre IA, sans récompense.
- `catalog-encounter.html` : exercices abstraits pour les 43 entités dépendantes d’un contexte.

### Reconstruire et vérifier
```sh
python3 scripts/build-catalog-v070.py
python3 scripts/build-lore-movesets.py
python3 scripts/compile-content.py
node scripts/contract.mjs --write
npm install --no-save --package-lock=false @napi-rs/canvas@0.1.80
npm run verify
python3 scripts/release-v070.py
npm run build
```
Les captures du contrôle navigateur local sont dans le rapport de livraison. Le registre complet des identifiants est `docs/CATALOG_REGISTER_v0.7.0.md`.

Les données de l’annexe sont séparées dans `data/catalog-expansion-v070.json`. Les champs `canonicalMovesetComplete=false` et `finalArt=false` empêchent de confondre couverture de fiches, intégration expérimentale et fidélité finale.

Resident Evil et ses personnages appartiennent à leurs ayants droit, dont Capcom. Projet de fans, non officiel.
