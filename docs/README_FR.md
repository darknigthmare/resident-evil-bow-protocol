# Resident Evil — B.O.W. Protocol

## v0.7.1 — Journal des essais

Fangame non officiel, base CQC Versus Legacy. Version construite sur la PR7 du catalogue.

**115 combattants principaux + 231 prototypes expérimentaux isolés + 43 exercices contextuels.** Les 389 identités sont cataloguées ; ce ne sont pas 389 combattants complets 1:1.

### Jouer
```sh
npm start
```
Ouvrir l’adresse affichée. Le projet conserve ses lanceurs précédents.

- `catalog.html` : annexe des 274 fiches.
- `catalog-duel.html` : clavier, tactile et manette standard ; aucune progression.
- `catalog-laboratory.html` : commandes des prototypes dans le moteur CQC.
- `catalog-encounter.html` : 43 exercices abstraits avec journal local et reprise en pause.

### Vérifier / compiler
```sh
npm install --no-save --package-lock=false @napi-rs/canvas@0.1.80
npm run verify
npm run build
```
Après un changement aux exercices : `node scripts/context-contract.mjs --write` puis tests. Après un changement au moteur principal : `node scripts/contract.mjs --write` puis tests. Modifier une empreinte ne rétablit pas la compatibilité des anciennes sauvegardes.

Voir `docs/RELEASE_NOTES_v0.7.1.md` et le manifeste pour les tests et limites. Les sources de la PR7 sont conservées sans révision des données de lore. Aucun nouvel asset définitif ou répertoire officiel complet n’est revendiqué. La création d’une PR n’est pas un déploiement de production.

Univers, personnages et lieux Resident Evil appartiennent à leurs ayants droit, dont Capcom.
