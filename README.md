# Resident Evil — B.O.W. Protocol

## v0.6.1 — Containment Continuity

Prototype de combat 2D basé sur CQC Versus Legacy v0.60. Projet de fans non officiel.
115 incarnations / 1 150 commandes / 115 Dossiers / 460 conclusions stylisées / 389 entrées de catalogue / 52 configurations d’arène.

### Lancer

```sh
npm start
```

Ouvrir l’adresse locale imprimée par le serveur. Les lanceurs Windows et macOS/Linux sont également conservés.

### Nouveautés pratiques

- Dans **Opérations**, suspendre puis **Reprendre le parcours**. Export/import JSON disponible dans le panneau Machine à écrire. Un duel en cours reprend depuis son début, pas au milieu d’une animation. Nouveau parcours = remplacement de la reprise ; Dossiers/records conservés.
- Dans **Movesets**, le lien **TESTER** de chaque technique ouvre le **Banc d’essai** : `laboratory.html`. Pause, +1 frame, démarrage, garde du mannequin, distance et collisions.
- L’**Archive des conclusions** (`finishers.html`) donne accès aux 460 fiches existantes. Les scènes restent stylisées et non canoniques.
- `coverage.html` distingue les 274 entrées encore documentaires et les visuels provisoires.

Les replays de versions antérieures sans contrat ne sont pas effacés ; ils nécessitent leur ancienne version du jeu. Aucune synchronisation cloud n’est incluse.

### Vérifier et compiler

```sh
npm install --no-save --package-lock=false @napi-rs/canvas@0.1.80
npm run verify
npm run build
```

Après une modification des données ou du gameplay :

```sh
python3 scripts/build-lore-movesets.py
python3 scripts/compile-content.py
node scripts/contract.mjs --write
npm run verify
python3 scripts/release-v061.py
npm run build
```

Le build échoue aux tests si l’empreinte de contrat n’est plus cohérente. Lire les notes de release et le manifeste dans `docs/`. Une archive valide n’atteste pas d’un déploiement public ; consulter Vercel et le rapport de livraison correspondant.

### Fidélité

Les formes et capacités sont compartimentées par incarnation. Les valeurs de combat, contrôles, duels et finishers sont adaptés au versus. Les poses RE5 et six composites E-001 restent provisoires ; les animations par technique et points faibles spatiaux sont encore à produire. Aucun 1:1 visuel/animé exhaustif n’est revendiqué.

Resident Evil, ses personnages et lieux appartiennent à leurs ayants droit dont Capcom. Ce projet n’est pas un produit officiel.
