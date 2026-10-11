#!/usr/bin/env python3
from pathlib import Path
import hashlib,json
R=Path(__file__).resolve().parents[1]
def J(p):return json.loads((R/p).read_text(encoding='utf-8'))
def W(p,s):q=R/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_text(s.rstrip()+'\n',encoding='utf-8')
p=J('package.json');d=J('data/roster.json');e=J('tests/engine-results.json');g=J('tests/pages-results.json');u=J('tests/ui-results.json');c=d['counts'];v=p['version'];n=e['passed']+g['passed']+(u['checks']-u['failures']);assert(v,c['fighters'],c['loreMoves'],c['stories'],c['finishers'],c['paintedArenas'])==('0.5.0',99,990,99,396,36);assert e['failed']==g['failed']==u['failures']==0
ids=['re7-mia-winters-infected','re7-jack-baker','re7-jack-baker-scissor','re7-marguerite-baker','re7-lucas-baker','re7-eveline'];by={x['uid']:x for x in d['fighters']};rows='\n'.join(f"| {by[x]['name']} | {by[x]['combat']['role']} | {by[x]['bioAgent']} |" for x in ids)
readme=f'''# Resident Evil — B.O.W. Protocol

**Version {v} — E-001 Family Protocol.** Jeu de combat 2D de fans construit à partir du moteur CQC Versus Legacy v0.60.

## Contenu

- **{c['fighters']}** incarnations jouables et **{c['loreMoves']}** techniques auditées.
- **{c['canonicalMoves']}** canoniques, **{c['anatomicalMoves']}** anatomiques et **{c['simulationMoves']}** fonctions de simulation.
- **{c['stories']}** Dossiers / **{c['duels']}** essais / **{c['finishers']}** conclusions.
- **{c['catalog']}** fiches de Bestiaire et **{c['paintedArenas']}** configurations d’arène.
- Huit protocoles, dont Apex Mutation et **E-001 Family Protocol**.

| Nouveau sujet | Rôle | Agent |
|---|---|---|
{rows}

Production : <https://resident-evil-bow-protocol.vercel.app/>  
GitHub : <https://github.com/darknigthmare/resident-evil-bow-protocol>

## Validation

- Lore : {c['fighters']}/{c['fighters']} profils, {c['loreMoves']}/{c['loreMoves']} techniques, {c['fighters']} signatures distinctes.
- Moteur : {e['passed']}/{e['passed']}.
- Bestiaire et Opérations : {g['passed']}/{g['passed']}.
- Interface : {u['checks']}/{u['checks']}.
- Total : **{n}/{n}**.

## Frontière de fidélité

Formes, agents, anatomies, équipements et familles d’attaque suivent les incarnations indiquées. Commandes, frames, dégâts, collisions, duels croisés et finishers sont des adaptations originales. Aucun asset, animation ou paramètre interne propriétaire n’est revendiqué comme extrait.
''';W('README.md',readme);W('docs/README_FR.md',readme)
W('docs/RELEASE_NOTES_v0.5.0.md',f'''# B.O.W. Protocol {v} — E-001 Family Protocol

Six nouvelles incarnations de Dulvey, 99 sujets, 990 techniques, 99 Dossiers, 396 conclusions et 36 arènes. Nouveau parcours fixe E-001 de quatorze sujets. Validation : {n}/{n}.''')
W('docs/AUDIT_LORE_V050.md',f'''# Audit lore v{v}

- Profils : {c['fighters']}/{c['fighters']}.
- Techniques : {c['loreMoves']}/{c['loreMoves']}.
- Canonique : {c['canonicalMoves']}.
- Anatomique : {c['anatomicalMoves']}.
- Simulation : {c['simulationMoves']}.
- Signatures distinctes : {c['fighters']}.
''')
W('docs/VERIFICATION_FR.md',f'''# Vérification v{v}

| Suite | Résultat |
|---|---:|
| Moteur et Dossiers | {e['passed']}/{e['passed']} |
| Bestiaire et Opérations | {g['passed']}/{g['passed']} |
| Interface | {u['checks']}/{u['checks']} |
| Total | {n}/{n} |
''')
dep={'projectName':'resident-evil-bow-protocol-live','vercelProjectId':'prj_abPeaRZXnL3rPrzzG3OofsCdDAqp','vercelTeamId':'team_VrIjq2UWV6VaHZr7DdQFwvfu','githubRepository':'darknigthmare/resident-evil-bow-protocol','productionUrl':'https://resident-evil-bow-protocol.vercel.app/','googleDriveFolder':'https://drive.google.com/drive/folders/1_nofjkXcnWNcIYh-jK0_AcB32-sZD9g5','version':v,'releaseDate':'2026-10-11','developmentBranch':'codex/v0.5-e001-family-protocol','productionStatus':'PENDING_V050_PROMOTION','verification':{'executableChecks':n,'passed':n,'failed':0},'familyRoutePath':'/operations.html?mode=family'};W('docs/deployment.json',json.dumps(dep,ensure_ascii=False,indent=2))
mp='docs/RELEASE_MANIFEST_v0.5.0.json';files=[]
for q in sorted(R.rglob('*')):
 if q.is_file():
  z=q.relative_to(R).as_posix()
  if not z.startswith(('dist/','node_modules/','.git/')) and z!=mp:files.append({'path':z,'bytes':q.stat().st_size,'sha256':hashlib.sha256(q.read_bytes()).hexdigest()})
manifest={'schema':'re.bow.release-manifest/1','project':'Resident Evil — B.O.W. Protocol','version':v,'codename':'E-001 Family Protocol','releaseDate':'2026-10-11','counts':c,'verification':{'executableChecks':n,'passed':n,'failed':0},'files':files};W(mp,json.dumps(manifest,ensure_ascii=False,indent=2));print(json.dumps({'version':v,'fighters':c['fighters'],'moves':c['loreMoves'],'checks':n,'files':len(files)}))
