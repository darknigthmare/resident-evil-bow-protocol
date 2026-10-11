#!/usr/bin/env python3
"""Produce release records from executed test results, never from requested totals."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text(encoding='utf8'))
def put(p,v):(R/p).write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
d=read('data/roster.json');v=d['version'];suites={}
for key,file in [('engine','engine-results.json'),('pages','pages-results.json'),('ui','ui-results.json'),('re5','v060-results.json')]:
 t=read('tests/'+file);failed=t.get('failed',t.get('failures',0));passed=t['passed'] if 'passed' in t else t['checks']-failed;assert failed==0,(key,failed);suites[key]={'passed':passed,'failed':failed}
total=sum(x['passed'] for x in suites.values());assert total>=78
names=[f['name'] for f in d['fighters'] if f['uid'] in d['protocols']['uroboros']['ids']]
manifest={'version':v,'codename':'Uroboros Ascension','counts':d['counts'],'newSubjects':names,'verification':{'passed':total,'failed':0,'suites':suites,'browserLayout':'NOT_VERIFIED — local HTTP navigation blocked by environment administrator','scope':'Executed engine, paired controlled DOM windows and native Canvas. Not a lore certification.'},'remaining':{'documentaryEntriesWithinExistingCatalog':274,'newReferenceOnlySprites':16,'previousCompositeSpritesFlagged':6,'spatialWeakpoints':False,'perMoveSkeletalAnimation':False,'franchiseExhaustive':False}}
put('docs/RELEASE_MANIFEST_v0.6.0.json',manifest)
notes='''# B.O.W. Protocol v0.6.0 — Uroboros Ascension

115 incarnations jouables, 1 150 commandes, 115 dossiers (920 essais), 460 conclusions stylisées, 52 configurations d’arène.

## RE5
'''+ '\n'.join('- '+n for n in names)+'''

## Changements exécutables
- Seize nouveaux movesets construits sans hériter d’effets d’une autre incarnation.
- Munitions/rechargement, chaleur/refroidissement, sécrétions, prises et mobilité selon les profils.
- Feu : noyau Uroboros/Mkono exposé temporairement ; réassemblage interdit pendant la brûlure.
- Ouvertures de noyau sur les grandes actions ; ce sont des multiplicateurs globaux, pas des points faibles spatiaux.
- Gravats de Ndesu avec gravité ; rafale Gatling avec fenêtre de récupération et délai de réutilisation.
- Nouveau parcours Uroboros de 16 sujets. Les parcours Family (14) et Apex (12) ne perdent ni ne remplacent un adversaire lorsque le joueur sélectionne le même sujet.
- Registre couverture : 274 entrées encore documentaires dans le catalogue existant de 389.
- Seize décors procéduraux originaux, à partir de neuf thèmes de scènes ; pas seize peintures ou cartes extraites.

## Limites visuelles et lore
Les 16 nouvelles représentations sont les illustrations de référence déjà présentes au catalogue, parfois partielles. Aucune anatomie manquante n’a été dessinée automatiquement. Les six composites E-001 de la v0.5 sont désormais explicitement signalés provisoires. Les autres poses héritées n’ont pas été recertifiées.
Les noms de commandes, valeurs, frames, enchaînements, contrôles, duels croisés et finishers sont des adaptations de combat 2D. Les familles d’action sourcées ne prouvent pas que chaque commande soit canonique, ni que le moveset complet du jeu original soit reproduit.
Les animations par technique, points faibles spatiaux, mutations scénarisées, faune et autres créatures documentaires restent à produire.

## QA
'''+f'{total} contrôles exécutables réussis : moteur {suites["engine"]["passed"]}, pages {suites["pages"]["passed"]}, interface {suites["ui"]["passed"]}, RE5 {suites["re5"]["passed"]}. Contrôle de structure lore séparé. Seize duels CPU complets, tests de projection et ressources, 345 combinaisons de sélection pour les routes fixes. Rendu natif Canvas des seize décors. Pas de certification CSS/mobile : la navigation HTTP du navigateur local a été bloquée par l’environnement.\n'
(R/'docs/RELEASE_NOTES_v0.6.0.md').write_text(notes,encoding='utf8')
(R/'README.md').write_text('''# Resident Evil — B.O.W. Protocol

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
''',encoding='utf8')
(R/'docs/README_FR.md').write_text((R/'README.md').read_text(),encoding='utf8')
print(json.dumps({'version':v,'passed':total,'suites':suites}))
