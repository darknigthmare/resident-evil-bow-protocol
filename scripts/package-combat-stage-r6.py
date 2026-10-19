#!/usr/bin/env python3
"""Package exact tracked source and fresh QA into bounded ZIPs, preserving dotfiles."""
from pathlib import Path
import hashlib,json,subprocess,zipfile
R=Path(__file__).resolve().parents[1];out=R/'r6-delivery';out.mkdir(exist_ok=True)
BASE='28f9b16d6bb1dc00d94a50848f47bb44e8cf0e2b'
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
log=(R/'combat-stage-r6-verify.log').read_text(encoding='utf8')
passed=sum(line.startswith('PASS ') for line in log.splitlines())
assert passed==267 and not any(line.startswith('FAIL ') for line in log.splitlines()),'Unexpected executable test result'
def result(file,count):
 d=json.loads((R/file).read_text());assert d['passed']==count and d['failed']==0,file;return d
browser=result('qa-combat-stage-r6/BROWSER_R6_RESULTS.json',12)
recovery=result('qa-renderer-r5/BROWSER_R5_RESULTS.json',2)
new_tests=result('docs/COMBAT_STAGE_R6_TESTS.json',24)
source=out/'BOW_PROTOCOL_PR11_R6_SOURCE.zip'
subprocess.run(['git','archive','--format=zip','--prefix=bow-combat-stage-r6/','-o',str(source),'HEAD'],cwd=R,check=True)
names=['01_CODE_R6.zip','02_ASSETS_A_R6.zip','03_ASSETS_B_R6.zip'];parts={n:[] for n in names};sizes={n:0 for n in names[1:]};manifest={}
archives={n:zipfile.ZipFile(out/n,'w',zipfile.ZIP_DEFLATED,compresslevel=6) for n in names}
try:
 with zipfile.ZipFile(source) as z:
  assert z.testzip() is None
  for item in sorted((i for i in z.infolist() if not i.is_dir()),key=lambda i:i.compress_size,reverse=True):
   p=Path(item.filename).relative_to('bow-combat-stage-r6');assert '..' not in p.parts
   rel=p.as_posix();data=z.read(item);manifest[rel]=hashlib.sha256(data).hexdigest()
   group=min(sizes,key=sizes.get) if rel.startswith('assets/') else names[0]
   if group in sizes:sizes[group]+=item.compress_size
   archives[group].writestr(item.filename,data);parts[group].append(rel)
finally:
 for z in archives.values():z.close()
recovered={}
for name in names:
 assert (out/name).stat().st_size<90*1024*1024
 with zipfile.ZipFile(out/name) as z:
  assert z.testzip() is None
  for item in z.namelist():
   rel=Path(item).relative_to('bow-combat-stage-r6').as_posix();assert rel not in recovered
   recovered[rel]=hashlib.sha256(z.read(item)).hexdigest()
assert recovered==manifest and any(p.startswith('.github/workflows/') for p in recovered)
assert not any(p.startswith('.github/integration/combat-stage-r6.') for p in recovered)
report={'sourceCommit':commit,'baseCommit':BASE,'revision':'R6','packageVersion':'0.7.3','sourceFiles':len(manifest),'files':manifest,'parts':parts,'verification':{'executablePassed':passed,'executableFailed':0,'browserR6Passed':browser['passed'],'browserR5RecoveryPassed':recovery['passed'],'physicalDeviceCertification':False},'scope':{'mainFighters':115,'experimentalFighters':231,'contextualExercises':43,'changedMainProfiles':4,'recomposedStages':4,'newCharacterArt':0,'fullOneToOneClaim':False}}
with zipfile.ZipFile(out/'00_RAPPORT_PATCHES_R6.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFESTE_R6.json',json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 z.writestr('verifier_reconstruction.py',"from pathlib import Path\nimport json,hashlib,sys\nh=Path(__file__).resolve().parent;m=json.loads((h/'MANIFESTE_R6.json').read_text());r=h/'bow-combat-stage-r6';errors=[n for n,s in m['files'].items() if not (r/n).is_file() or hashlib.sha256((r/n).read_bytes()).hexdigest()!=s];print('Commit:',m['sourceCommit'],'Files:',len(m['files']),'Errors:',errors);sys.exit(bool(errors))\n")
 for file in ['docs/COMBAT_STAGE_R6_SCOPE.md','docs/COMBAT_STAGE_R6_MANIFEST.json','docs/COMBAT_STAGE_R6_BASELINES.json','docs/COMBAT_STAGE_R6_TESTS.json','docs/RENDERER_RECOVERY_R5_TESTS.json','docs/DIRECTIONAL_R4_SCOPE.md','combat-stage-r6-verify.log']:
  z.write(R/file,Path(file).name)
 for folder in ['qa-combat-stage-r6','qa-renderer-r5']:
  for file in sorted((R/folder).glob('*')):
   if file.is_file():z.write(file,folder+'/'+file.name)
 z.writestr('BOW_PR11_R6_FROM_R5.patch',subprocess.check_output(['git','diff','--binary',BASE,'HEAD'],cwd=R))
 z.writestr('LISEZ_MOI_R6.txt',f'''B.O.W. PROTOCOL — PR11 / R6 — Combat et chambres animees\nCommit source: {commit}\nExtraire les quatre ZIP dans le meme dossier. Le projet est sous bow-combat-stage-r6/.\nLancer python verifier_reconstruction.py puis npm start dans le dossier du jeu.\nOuvrir http://localhost:5173/stages.html pour les decors. Depuis le menu, ouvrir le laboratoire et choisir Nemesis lance-roquettes ou Nemesis stade 2.\nLe laboratoire prepare explicitement la jauge de test ; ses resultats ne donnent ni victoire ni progression.\nR6 : salves interrompables, detonations au contact, deux fenetres de super, effets communs et quatre recompositions de scenes. Les delais, valeurs, commandes, geometries et choregraphies nouvelles restent des adaptations 2D.\n267 groupes executables, 12 controles Chromium HTTP R6 et 2 controles de reprise d'image R5 executes dans le workflow de packaging. Pas de telephone/manette physique certifie.\nAucune nouvelle animation finale de personnage, ni repertoire officiel exhaustif. PR conservee en brouillon, sans fusion ni promotion de production.\n''')
checks={}
for name in ['00_RAPPORT_PATCHES_R6.zip',*names]:
 with zipfile.ZipFile(out/name) as z:assert z.testzip() is None
 checks[name]=hashlib.sha256((out/name).read_bytes()).hexdigest()
(out/'SHA256_R6.json').write_text(json.dumps({'sourceCommit':commit,'files':checks},indent=2)+'\n')
print(json.dumps({'sourceCommit':commit,'verifiedSourceFiles':len(manifest),'executedGroups':passed,'browser':14,'parts':[{'name':n,'bytes':(out/n).stat().st_size,'sha256':h} for n,h in checks.items()]},indent=2))
