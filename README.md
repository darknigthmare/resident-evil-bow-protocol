# Resident Evil — B.O.W. Protocol

## v0.7.3 · R20 — Interface joueur et sprites

115 combattants principaux + 231 prototypes isolés + 43 exercices contextuels. Pas 389 combattants 1:1 finalisés.

```sh
npm start
```

Ouvrir l’URL affichée par le serveur. Le menu d’accueil donne accès aux modes de jeu, aux Dossiers, à l’entraînement, aux archives et aux options. Les touches ↑/↓ et Entrée permettent de naviguer, Échap ramène au panneau précédent. Une manette utilisant le mapping standard du navigateur peut également piloter le menu.

Les options proposent le plein écran, les animations réduites, le contraste élevé et le grand texte. Le centre de sauvegardes R19 reste accessible depuis ce panneau. Les préférences d’interface R20 sont enregistrées séparément de la progression.

### Outils de développement

Ouvrir `dev.html`, ou utiliser Ctrl+Maj+D dans le menu d’accueil. Le suffixe `?dev=1` expose les commandes techniques de la page courante. Le laboratoire, les exercices contextuels, les audits, les classeurs et la visionneuse de sprites sont réunis dans ce parcours dédié.

### Validation

Installer les dépendances de validation, puis lancer :

```sh
npm install --no-save --package-lock=false @napi-rs/canvas@0.1.80 playwright@1.64.1
npx playwright install chromium
```

```sh
npm run verify
npm run build
npm run verify:r20:http
```

`CHROME_BIN` peut désigner un Chromium déjà installé pour les recettes HTTP. Les résultats et captures des recettes navigateur sont produits dans les dossiers `qa-*`. Voir [la validation R20](docs/R20_VALIDATION.md), [le suivi Excel](docs/planning/BOW_INTERFACE_SPRITES_R20.xlsx) et [la documentation des sprites](docs/SPRITES_R20.md).

Les sprites indépendants de Tyrant RE2R, Licker RE2R, Hunter RE1R et Nemesis RE3R sont livrés avec transparence, manifestes et provenance. Ils servent à la présentation du menu et à la visionneuse DEV ; Tyrant et Nemesis disposent aussi d’une surcouche de portrait dans la sélection Versus. Le rendu animé des combats est conservé. Les animations, le découpage en membres et la fidélité 1:1 du catalogue complet restent à produire.

Fangame non officiel : Resident Evil appartient à ses ayants droit, dont Capcom. Voir également les notes de version et le manifeste dans `docs/`.
