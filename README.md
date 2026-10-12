# Resident Evil — B.O.W. Protocol

## v0.6.0 — Uroboros Ascension

Prototype de combat 2D basé sur CQC Versus Legacy v0.60. Projet de fans non officiel.

115 incarnations jouables / 1 150 commandes / 389 entrées documentaires et jouables / 52 configurations d’arène.

Seize nouveaux sujets RE5, un parcours Tricell, des ressources spécifiques, fenêtres de vulnérabilité et registre des manquants. Les sprites RE5 sont des références provisoires, pas des animations latérales 1:1.

### Lancer

```sh
npm start
```

### Vérifier et compiler

```sh
npm install --no-save --package-lock=false @napi-rs/canvas@0.1.80
npm run verify
npm run build
```

Lire `docs/RELEASE_NOTES_v0.6.0.md`, `docs/RELEASE_MANIFEST_v0.6.0.json` et `coverage.html` pour distinguer livraisons et éléments manquants.

La migration `scripts/apply-v060-uroboros.py` est idempotente. `scripts/integrate-v060.py` relie les nouveaux modules au runtime existant. Exécuter ensuite `scripts/build-lore-movesets.py` et `scripts/compile-content.py`.

Resident Evil, ses personnages et lieux appartiennent à leurs ayants droit dont Capcom. Cette simulation n’est pas un produit officiel et ne prétend pas extraire des paramètres internes de jeux commerciaux.
