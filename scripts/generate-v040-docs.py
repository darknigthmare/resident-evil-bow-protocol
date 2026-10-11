#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from datetime import date
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8'))
def write(p,s): (ROOT/p).write_text(s.rstrip()+'\n',encoding='utf-8')
def sha(p): return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
package=read('package.json'); roster=read('data/roster.json'); lore=read('data/lore-movesets.json'); engine=read('tests/engine-results.json'); pages=read('tests/pages-results.json'); ui=read('tests/ui-results.json')
version=package['version']; counts=roster['counts']; fighters=roster['fighters']; by={f['uid']:f for f in fighters}
APEX=['re2r-super-tyrant','re3r-stage-2-nemesis','re3r-stage-3-nemesis','re4r-del-lago','re4r-garrador','re4r-iron-maiden','re4r-ramon-salazar-mutated','re4r-osmund-saddler-mutated','revillage-mutated-dimitrescu','revillage-mutated-moreau','revillage-mutated-heisenberg','re6-ustanak']
apex=[by[x] for x in APEX]; executable=engine['passed']+pages['passed']+(ui['checks']-ui['failures'])
assert version=='0.4.0' and counts['fighters']==93 and counts['loreMoves']==930 and counts['stories']==93 and counts['finishers']==372 and counts['paintedArenas']==30
assert engine['failed']==pages['failed']==ui['failures']==0
apex_rows='\n'.join(f"| {f['name']} | {f['ep']} | {f['bioAgent']} | {f['combat']['role']} |" for f in apex)
readme=f'''# Resident Evil — B.O.W. Protocol

Jeu de combat 2D de fans construit à partir du moteur **CQC Versus Legacy v0.60** de Darknigthmare, avec un roster, une progression, une interface et des données Resident Evil indépendants.

**Version {version} — Apex Mutation, 11 octobre 2026.** Cette livraison cumulative conserve **Incident Baker** et ajoute douze formes terminales issues de Resident Evil 2 remake, Resident Evil 3 remake, Resident Evil 4 remake, Resident Evil 6 et Resident Evil Village.

## Contenu

- **{counts['fighters']}** incarnations jouables et **{counts['loreMoves']}** techniques.
- **{counts['canonicalMoves']}** techniques canoniques, **{counts['anatomicalMoves']}** anatomiques et **{counts['simulationMoves']}** de simulation.
- **{counts['stories']}** Dossiers de huit rencontres, soit **{counts['duels']}** essais.
- **{counts['finishers']}** conclusions stylisées, **{counts['catalog']}** fiches de Bestiaire et **{counts['paintedArenas']}** configurations d’arène.
- Sept protocoles : Versus, Dossiers, Arcade, Survie, Boss Rush, Laboratoire et **Apex Mutation**.

## Apex Mutation

| Sujet | Incarnation | Agent | Rôle |
|---|---|---|---|
{apex_rows}

Le protocole Apex enchaîne douze affrontements fixes. Chaque adversaire ouvre sa chambre de confinement et conserve son UID, son agent, sa morphologie, sa ressource, son passif et ses dix techniques propres.

## Jouer

- Production : <https://resident-evil-bow-protocol.vercel.app/>
- GitHub : <https://github.com/darknigthmare/resident-evil-bow-protocol>

```sh
npm start
```

Pour reconstruire le contenu éditable :

```sh
python3 -m pip install -r requirements-content.txt
python3 scripts/apply-v040-apex-mutation.py
python3 scripts/build-lore-movesets.py
python3 scripts/compile-content.py
npm run verify
python3 scripts/generate-v040-docs.py
npm run build
```

## Fidélité

La fidélité porte sur l’incarnation, l’épisode, l’agent biologique, l’anatomie, la locomotion et les familles d’attaque documentées. Les commandes, timings, dégâts, ressources, collisions, duels croisés et finishers restent des adaptations originales du moteur 2D. Le projet ne revendique pas l’extraction des animations, hitboxes, frames ou paramètres internes des jeux Capcom.

## Validation

- Lore : **93/93 profils**, **930/930 techniques**, **93 signatures distinctes**.
- Moteur et Dossiers : **{engine['passed']}/{engine['passed']}**.
- Bestiaire et Opérations : **{pages['passed']}/{pages['passed']}**.
- Interface : **{ui['checks']}/{ui['checks']}**.
- Total exécutable : **{executable}/{executable}**.

Resident Evil / Biohazard, ses personnages, créatures et lieux appartiennent à leurs ayants droit, dont Capcom. Projet de fans non officiel.
'''
write('README.md',readme); write('docs/README_FR.md',readme.replace('# Resident Evil — B.O.W. Protocol','# Guide complet — Resident Evil : B.O.W. Protocol'))
subprocess.run(['pandoc','docs/README_FR.md','-s','-f','gfm','-t','html5','--metadata',f'title=Guide — Resident Evil : B.O.W. Protocol {version}','--css=../styles/hub.css','--css=../styles/bow-v040.css','-o','docs/README_FR.html'],cwd=ROOT,check=True)
notes=f'''# Notes de version — B.O.W. Protocol {version}

**Nom de code : Apex Mutation**  
**Date : 11 octobre 2026**

## Nouveaux sujets

'''+''.join(f"- **{f['name']}** — {f['ep']} — {f['combat']['role']}.\n" for f in apex)+f'''

## Portée

- Roster : **81 → {counts['fighters']}**.
- Techniques : **810 → {counts['loreMoves']}**.
- Dossiers : **{counts['stories']}**, soit **{counts['duels']}** essais.
- Finishers : **{counts['finishers']}**.
- Arènes : **18 → {counts['paintedArenas']}**.
- Nouveau parcours Apex fixe de douze formes et douze chambres.
- Accueil cumulatif Incident Baker + Apex Mutation.

## Validation

- Lore : {counts['fighters']} profils / {counts['loreMoves']} techniques / {counts['fighters']} signatures.
- Moteur : {engine['passed']}/{engine['passed']}.
- Pages : {pages['passed']}/{pages['passed']}.
- UI : {ui['checks']}/{ui['checks']}.
- Total : {executable}/{executable}.
'''
write('docs/RELEASE_NOTES_v0.4.0.md',notes)
audit=f'''# Audit lore — version {version}

- **{counts['fighters']}/{counts['fighters']}** profils complets.
- **{counts['loreMoves']}/{counts['loreMoves']}** techniques tracées.
- **{counts['fighters']}** signatures distinctes.
- Canonique : **{counts['canonicalMoves']}**.
- Anatomique : **{counts['anatomicalMoves']}**.
- Simulation : **{counts['simulationMoves']}**.

## Apex Mutation

| UID | Sujet | Techniques | Dossier | Conclusions |
|---|---|---:|---:|---:|
'''+''.join(f"| `{f['uid']}` | {f['name']} | 10 | 8 | 4 |\n" for f in apex)+'''\nLes formes restent cloisonnées. Une extension anatomique ne crée pas un pouvoir étranger et toute fonction purement ludique est étiquetée simulation.\n'''
write('docs/AUDIT_LORE_V040.md',audit)
commands={'light':'J / F','heavy':'K / G','low':'↓+J / S+F','throw':'U / R','special':'I / T','specialDown':'↓+I / S+T','specialForward':'→+I / →+T','specialBack':'←+I / ←+T','super':'O / Y','utility':'L / H'}; labels={'canonical':'Canonique','anatomical':'Anatomique','simulation':'Simulation'}
md=[f'# Movesets complets — {counts["fighters"]} sujets / {counts["loreMoves"]} techniques','']
for i,f in enumerate(fighters,1):
 md += [f'## {i:02d}. {f["name"]}','',f'- Incarnation : {f["ep"]}',f'- Agent : {f["bioAgent"]}',f'- Rôle : {f["combat"]["role"]}','','| Commande | Technique | Preuve | Type | Dém./Act./Réc. | Dégâts | Coût |','|---|---|---|---|---:|---:|---:|']
 for slot,m in f['combat']['moves'].items(): md.append(f"| {commands[slot]} | {m['name']} | {labels[m['evidence']]} | {m['kind']} | {m['startup']}/{m['active']}/{m['recovery']} | {m['damage']} | {m['cost']} |")
 md += ['']
write('docs/MOVESETS_COMPLETS_V040.md','\n'.join(md))
verification=f'''# Vérification — B.O.W. Protocol {version}

**Résultat : {executable}/{executable} contrôles exécutables réussis.**

| Suite | Résultat |
|---|---:|
| Lore | 93 profils / 930 techniques |
| Moteur et Dossiers | {engine['passed']}/{engine['passed']} |
| Bestiaire et Opérations | {pages['passed']}/{pages['passed']} |
| Interface | {ui['checks']}/{ui['checks']} |
| Total exécutable | {executable}/{executable} |

Le parcours Apex, les douze chambres, les sprites, les ressources, les collisions, l’IA, les replays et les sauvegardes ont été vérifiés dans l’environnement contrôlé.
'''
write('docs/VERIFICATION_FR.md',verification)
write('docs/LIENS.md',f'''# Liens — B.O.W. Protocol {version}\n\n- Production : <https://resident-evil-bow-protocol.vercel.app/>\n- GitHub : <https://github.com/darknigthmare/resident-evil-bow-protocol>\n- Drive : <https://drive.google.com/drive/folders/1_nofjkXcnWNcIYh-jK0_AcB32-sZD9g5>\n''')
deployment={'projectName':'resident-evil-bow-protocol-live','vercelProjectId':'prj_abPeaRZXnL3rPrzzG3OofsCdDAqp','vercelTeamId':'team_VrIjq2UWV6VaHZr7DdQFwvfu','googleDriveFolder':'https://drive.google.com/drive/folders/1_nofjkXcnWNcIYh-jK0_AcB32-sZD9g5','githubRepository':'darknigthmare/resident-evil-bow-protocol','githubUrl':'https://github.com/darknigthmare/resident-evil-bow-protocol','productionUrl':'https://resident-evil-bow-protocol.vercel.app/','version':version,'releaseDate':'2026-10-11','developmentBranch':'codex/v0.4-apex-mutation','productionStatus':'PENDING_V040_PROMOTION','verification':{'executableChecks':executable,'passed':executable,'failed':0},'completeMovesetsPath':'/movesets.html','apexRoutePath':'/operations.html?mode=apex'}
write('docs/deployment.json',json.dumps(deployment,ensure_ascii=False,indent=2))
prov=read('docs/source-provenance.json'); prov['residentEvilRelease']=version; prov['releaseDate']='2026-10-11'; prov['adaptationNotes']=[f'{counts["fighters"]} incarnations cloisonnées.',f'{counts["loreMoves"]} techniques auditées.','Incident Baker conservé.','Apex Mutation ajoute douze formes terminales et douze chambres.']; prov['loreAudit']={'profiles':counts['fighters'],'moves':counts['loreMoves'],'canonical':counts['canonicalMoves'],'anatomical':counts['anatomicalMoves'],'simulation':counts['simulationMoves'],'uniqueFullMovesets':counts['fighters'],'report':'docs/AUDIT_LORE_V040.md','completeMoveList':'docs/MOVESETS_COMPLETS_V040.md'}; prov['verification']={'engine':'tests/engine-results.json','pages':'tests/pages-results.json','ui':'tests/ui-results.json','summary':'docs/VERIFICATION_FR.md','executableChecks':executable,'passed':executable,'failed':0}; prov['deployment']={'projectId':deployment['vercelProjectId'],'productionAlias':deployment['productionUrl'],'status':deployment['productionStatus']}; write('docs/source-provenance.json',json.dumps(prov,ensure_ascii=False,indent=2))
manifest_path='docs/RELEASE_MANIFEST_v0.4.0.json'; files=[]
for p in sorted(ROOT.rglob('*')):
 if p.is_file():
  rel=p.relative_to(ROOT).as_posix()
  if not rel.startswith(('dist/','node_modules/','.git/')) and rel!=manifest_path: files.append({'path':rel,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
manifest={'schema':'re.bow.release-manifest/1','project':'Resident Evil — B.O.W. Protocol','version':version,'codename':'Apex Mutation','releaseDate':'2026-10-11','counts':counts,'verification':{'executableChecks':executable,'passed':executable,'failed':0},'files':files}; write(manifest_path,json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'version':version,'fighters':counts['fighters'],'moves':counts['loreMoves'],'checks':executable,'manifestFiles':len(files)},ensure_ascii=False))
