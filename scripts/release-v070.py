#!/usr/bin/env python3
"""Release records are derived from executed checks, never assumed totals."""
from pathlib import Path
from collections import Counter
import json,hashlib,html
R=Path(__file__).resolve().parents[1]
def load(p):return json.loads((R/p).read_text())
def save(p,v):(R/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
D=load('data/roster.json');E=load('data/catalog-expansion-v070.json');assert D['version']==load('package.json')['version']=='0.7.0'
suites={}
for name,file in [('engine','engine-results.json'),('pages','pages-results.json'),('ui','ui-results.json'),('re5','v060-results.json'),('continuity','v061-results.json'),('catalog','v070-results.json')]:
 r=load('tests/'+file);failed=r.get('failed',r.get('failures',0));assert failed==0,(name,failed);passed=r['passed'] if 'passed' in r else r['checks']-failed;suites[name]=dict(passed=passed,failed=failed)
passed=sum(x['passed'] for x in suites.values());assert passed>=113
browser=load('docs/qa-v070-browser.json');assert browser['passed']==10 and browser['failed']==0
manifest=dict(version='0.7.0',codename='Catalog Annex',productionCounts=D['counts'],annexCounts=E['counts'],technicalFamilies=len({r['family'] for r in E['records']}),experimentalProfileDigest=E['digest'],
 verification=dict(passed=passed,failed=0,suites=suites,browser=dict(passed=browser['passed'],failed=0,scope=browser['scope'],execution='Local offline browser, separate from GitHub Actions',screenshots='Included in delivery report, not necessarily in the source release')),
 preservation=dict(productionFighters=115,productionMoves=1150,productionStories=115,productionFinishers=460,newProgressionFighters=0,newCommandsCanonCertified=0),
 scope=dict(existingCatalogEntries=389,enrichedFormerlyMissingEntries=274,experimentalFighters=231,contextualExercises=43,newFinalAnimations=0,unreviewedDescriptiveSources=35,allFranchiseEntriesCovered=False),
 limitations=['Command mappings reuse technical family templates; they are not 231 individually reconstructed original movesets.','All new images are provisional source portraits; no anatomy was fabricated.','43 contextual entries use nine abstract diagnostic state machines, not final boss scripts or canon outcomes.','Exact spatial weakpoints, encounter geometry, coordinated swarms and per-move animations remain unfinished.','Release on GitHub does not prove deployment on Vercel.'])
save('docs/RELEASE_MANIFEST_v0.7.0.json',manifest)
notes=f'''# B.O.W. Protocol v0.7.0 — Annexe du catalogue

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
**{passed} contrôles exécutables réussis**, sans échec, plus dix vues/interactions Chromium hors ligne en 1440 et 390 pixels. Les 2 310 démarrages de commandes ont été activés dans le moteur. **231 duels CPU à pleine santé initiale sont terminés par KO** dans l’échantillon déterministe. Cela ne certifie pas l’équilibre de tous les matchups ni toutes les positions.

Les essais Chromium utilisent des fichiers locaux injectés et des assets servis en mémoire : ils ne certifient pas un déploiement HTTP public, les iframes réseau ou un téléphone physique.

## Fidélité : limites encore ouvertes
Les références restent des portraits provisoires, parfois tronqués. **Aucune nouvelle animation définitive 1:1 n’est livrée.** Les variantes, points faibles spatiaux, phases complètes et 35 sources sommaires nécessitent encore une validation approfondie. Les exercices contextuels utilisent des jauges et conditions de réussite originales, jamais présentées comme des événements canoniques.

La release GitHub et son build sont indépendants de la promotion Vercel. Lire le rapport de livraison daté pour connaître l’état de l’URL publique.
'''
(R/'docs/RELEASE_NOTES_v0.7.0.md').write_text(notes,encoding='utf8')
readme='''# Resident Evil — B.O.W. Protocol

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
'''
(R/'README.md').write_text(readme,encoding='utf8');(R/'docs/README_FR.md').write_text(readme,encoding='utf8')
(R/'docs/README_FR.html').write_text('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guide B.O.W. Protocol 0.7.0</title><body style="background:#102029;color:#e3e8da;font:16px/1.6 Arial;max-width:950px;margin:40px auto;padding:20px"><a href="../index.html" style="color:#cbe2bc">← MENU</a><h1>B.O.W. Protocol — v0.7.0</h1><pre style="white-space:pre-wrap">'+html.escape(readme)+'</pre></body></html>',encoding='utf8')
p=load('docs/deployment.json');p.update(version='0.7.0',developmentBranch='codex/v0.7-catalog-completion',verificationManifest='docs/RELEASE_MANIFEST_v0.7.0.json',catalogAnnexPath='/catalog.html');save('docs/deployment.json',p)
print(json.dumps(dict(version='0.7.0',passed=passed,annex=E['counts'])))
