#!/usr/bin/env python3
"""Create release metadata from executed suites and the actual separated datasets."""
from pathlib import Path
import json,html
R=Path(__file__).resolve().parents[1]
def load(p):return json.loads((R/p).read_text(encoding='utf8'))
def save(p,v):(R/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
D=load('data/roster.json');E=load('data/catalog-expansion-v070.json');P=load('package.json');assert D['version']==E['version']==P['version']=='0.7.1'
suites={}
for label,file in [('engine','engine-results.json'),('pages','pages-results.json'),('ui','ui-results.json'),('re5','v060-results.json'),('continuity','v061-results.json'),('catalog','v070-results.json'),('journal','v071-results.json')]:
 r=load('tests/'+file);failed=r.get('failed',r.get('failures',0));assert failed==0,(label,failed);passed=r['passed'] if 'passed' in r else r['checks']-failed;suites[label]={'passed':passed,'failed':failed}
total=sum(v['passed'] for v in suites.values());browser=load('docs/qa-v071-browser.json');assert browser['failed']==0
manifest={'version':P['version'],'codename':'Journal des essais','productionCounts':D['counts'],'annexCounts':E['counts'],'basePR':7,'baseCommit':'d6c28a1ac530201036cce05940ad3edf5a6d7714','preservation':load('docs/PRESERVATION_v071.json'),'newPlayableSubjects':0,'newCanonAbilities':0,'verification':{'passed':total,'failed':0,'suites':suites,'browser':{'passed':browser['passed'],'failed':0,'scope':browser['scope'],'execution':'Local, distinct from CI; captures in delivery report.'}},'scope':{'mainProgression':115,'experimentalCombat':231,'contextualExercises':43,'catalogEntries':389,'newFinalAnimations':0},'features':['Distinct contextual success/failure and per-kind completion conditions','Replay-validated contextual checkpoint and two independent local slots','Unique contextual records without campaign rewards','Manual pause, input edge triggers, multi-pointer holds and standard-gamepad mapping','No promotion of experimental profiles into progression'], 'limitations':['The 43 exercises use nine abstract state machines, not the CQC physics or original boss scripts.','Trial input frames and thresholds are simulation design, not canon.','Checksums detect corruption; no anti-cheat or transactional tab lock claimed.','Local journal only; no cloud saves.','Per-move final animation, spatial weakpoints and incomplete primary-reference review remain open.','Old contextual checkpoints with incompatible contracts are preserved and rejected rather than silently migrated.','GitHub pull request and Drive archive do not establish production deployment.']}
save('docs/RELEASE_MANIFEST_v0.7.1.json',manifest)
notes=f'''# B.O.W. Protocol v0.7.1 — Journal des essais

Base exacte : PR nº 7, commit d6c28a1ac530201036cce05940ad3edf5a6d7714. Cette version prolonge la branche du catalogue au lieu de fusionner une archive locale concurrente.

## Périmètre préservé
115 combattants de progression, 231 prototypes de combat isolés et 43 exercices contextuels = 389 identités. Les 115 + 231 définitions et les 274 fiches de l’annexe sont inchangées (empreintes contrôlées). Aucun nouveau pouvoir canonique, nouvel adversaire ou sprite final n’est revendiqué.

## Correctifs contextuels
- Cocon : impossible de réussir avec « Progresser ». Seule une intégrité nulle interrompt l’incubation ; aucune attaque du cocon.
- Essaim : il faut réellement réduire la densité à zéro.
- Plantes et exercices de phases : contre-mesures uniquement dans la fenêtre de récupération.
- Eau et véhicules : progression ouverte pendant la récupération, pas en permanence.
- Explosion : une seule détonation ; rupture subie = échec, rupture évitée = réussite.
- Résultat explicite, temps maximal borné, commande indisponible sans prélèvement gratuit, bruit borné.

## Journal local
Sauvegarde d’une session précise sous la forme des commandes et de leurs frames. La restauration rejoue ces commandes et vérifie l’état produit ; elle ne charge pas une santé arbitraire. Deux copies à révision protègent contre une copie endommagée. Détection des conflits ordinaires entre onglets, erreurs de stockage explicites et import JSON borné. Une sélection réalisée pendant la lecture asynchrone d’un fichier n’est pas remplacée par l’import arrivé en retard.

Les records concernent les 43 exercices, une entrée par identité. Temps minimal et santé maximale sont deux meilleurs résultats indépendants. Il ne s’agit ni d’un compteur de victoires, ni d’une récompense de campagne. Aucun résultat n’est envoyé aux opérations. Sauvegardes cloud et anti-triche non implémentés.

## Commandes
Duel expérimental : dix commandes clavier, directions relatives, frappes et sauts déclenchés une fois par pression, touches rapides conservées jusqu’au prochain tick, maintien tactile indépendant par doigt, annulation à la perte du focus. Lecture sécurisée des manettes standard, y compris index vides ou API refusée. Aucun matériel physique n’a été testé.

## Validation
{total} tests exécutables passés : '''+', '.join(f'{k} {v["passed"]}' for k,v in suites.items())+'''. Les 43 exercices ont été terminés et leurs 43 reprises comparées frame par frame. Les anciens tests de 231 duels CPU sont conservés ; ils ne certifient pas toutes les paires.

Six vues/interactions Chromium hors ligne (trois pages, 1440 et 390 pixels) : commandes clavier, save/load, import endommagé, filtres et largeur du document. Le stockage du navigateur hors ligne est remplacé explicitement par une mémoire de test ; la persistance et les conflits sont testés séparément dans le harness. Navigation HTTP Chromium bloquée par l’administrateur, sans contournement.

## Limites
Les exercices contextuels restent abstraits, sans collision CQC ni scripts de boss Capcom. Les illustrations restent provisoires. La fidélité 1:1 des animations, des movesets complets et des lieux n’est pas certifiée. Les 35 références sommaires déjà signalées restent à documenter.
'''
(R/'docs/RELEASE_NOTES_v0.7.1.md').write_text(notes,encoding='utf8')
readme='''# Resident Evil — B.O.W. Protocol

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
'''
(R/'README.md').write_text(readme,encoding='utf8');(R/'docs/README_FR.md').write_text(readme,encoding='utf8')
(R/'docs/README_FR.html').write_text('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B.O.W. Protocol 0.7.1</title><body style="background:#102029;color:#e3e8da;font:16px/1.6 Arial;max-width:950px;margin:40px auto;padding:20px"><a href="../index.html" style="color:#cbe2bc">← MENU</a><h1>Journal des essais — v0.7.1</h1><pre style="white-space:pre-wrap">'+html.escape(readme)+'</pre></body></html>',encoding='utf8')
p=load('docs/deployment.json');p.update(version='0.7.1',developmentBranch='codex/v0.7.1-encounter-journal',verificationManifest='docs/RELEASE_MANIFEST_v0.7.1.json');save('docs/deployment.json',p)
print(json.dumps({'version':'0.7.1','passed':total,'browser':browser['passed'],'scope':manifest['scope']}))
