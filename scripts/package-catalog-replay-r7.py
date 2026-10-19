#!/usr/bin/env python3
"""Package exact tracked source and new test evidence. Never include local secrets."""
from pathlib import Path
import hashlib,json,subprocess,zipfile
R=Path(__file__).resolve().parents[1];out=R/'r7-delivery';out.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
base='5fe33a2535fba80dfb6e24d58efa7b934882107c'
log=(R/'catalog-replay-r7-verify.log').read_text(encoding='utf8')
passed=sum(s.startswith('PASS ') for s in log.splitlines());assert passed==291 and not any(s.startswith('FAIL ') for s in log.splitlines()),passed
browser=json.loads((R/'qa-catalog-replay-r7/BROWSER_R7_RESULTS.json').read_text());assert browser['passed']==8 and browser['failed']==0
r7=json.loads((R/'docs/CATALOG_REPLAY_R7_TESTS.json').read_text());assert r7['passed']==24 and r7['failed']==0
source=out/'BOW_PROTOCOL_PR11_R7_SOURCE.zip'
subprocess.run(['git','archive','--format=zip','--prefix=bow-replay-r7/','-o',str(source),'HEAD'],cwd=R,check=True)
names=['01_CODE_R7.zip','02_ASSETS_A_R7.zip','03_ASSETS_B_R7.zip'];sizes={n:0 for n in names[1:]};files={}
parts={n:zipfile.ZipFile(out/n,'w',zipfile.ZIP_DEFLATED,compresslevel=6) for n in names}
try:
 with zipfile.ZipFile(source) as z:
  assert z.testzip() is None
  for i in sorted((i for i in z.infolist() if not i.is_dir()),key=lambda i:i.compress_size,reverse=True):
   rel=Path(i.filename).relative_to('bow-replay-r7').as_posix();data=z.read(i);files[rel]=hashlib.sha256(data).hexdigest()
   name=min(sizes,key=sizes.get) if rel.startswith('assets/') else names[0]
   if name in sizes:sizes[name]+=i.compress_size
   parts[name].writestr(i.filename,data)
finally:
 for z in parts.values():z.close()
verified={}
for n in names:
 assert (out/n).stat().st_size<90*1024*1024
 with zipfile.ZipFile(out/n) as z:
  assert z.testzip() is None
  for p in z.namelist():
   rel=Path(p).relative_to('bow-replay-r7').as_posix();assert rel not in verified
   verified[rel]=hashlib.sha256(z.read(p)).hexdigest()
assert verified==files and any(p.startswith('.github/workflows/') for p in files)
manifest={'commit':commit,'base':base,'revision':'R7','version':'0.7.3','files':files,'sourceFileCount':len(files),'tests':{'executablePassed':passed,'newGroups':24,'browserHttpPassed':8,'physicalDevices':False},'main':115,'experimental':231,'contextual':43,'newCharacterArt':0}
with zipfile.ZipFile(out/'00_RAPPORT_PATCHES_R7.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFESTE_R7.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 z.writestr('BOW_R7_FROM_R6.patch',subprocess.check_output(['git','diff','--binary',base,'HEAD'],cwd=R))
 for p in ['docs/CATALOG_REPLAY_R7_SCOPE.md','docs/CATALOG_REPLAY_R7_TESTS.json','docs/CATALOG_REPLAY_R7_BASELINE.json','catalog-replay-r7-verify.log']:
  z.write(R/p,Path(p).name)
 for p in sorted((R/'qa-catalog-replay-r7').glob('*')):
  if p.is_file():z.write(p,'qa-catalog-replay-r7/'+p.name)
 z.writestr('VERIFIER.py',"from pathlib import Path\nimport json,hashlib,sys\nr=Path(__file__).resolve().parent;m=json.loads((r/'MANIFESTE_R7.json').read_text());d=r/'bow-replay-r7';bad=[p for p,h in m['files'].items() if not(d/p).is_file() or hashlib.sha256((d/p).read_bytes()).hexdigest()!=h];print('Commit:',m['commit'],'Fichiers:',len(m['files']),'Erreurs:',bad);sys.exit(bool(bad))\n")
 z.writestr('LISEZ_MOI_R7.txt',f'''B.O.W. Protocol / PR11 / R7\nCommit exact : {commit}\nExtraire les quatre ZIP dans le même dossier. Lancer python VERIFIER.py, puis npm start dans bow-replay-r7/.\nOuvrir http://localhost:5173/catalog-duel.html. Démarrer, jouer, mettre en pause, puis Exporter le replay. Importer pour lire et parcourir les frames sans modifier une campagne.\n291 groupes exécutables et 8 parcours HTTP Chromium vérifiés en CI. Aucun nouveau dessin ou pouvoir canonique. PR non fusionnée, aucun déploiement Vercel.\n''')
checks={n:hashlib.sha256((out/n).read_bytes()).hexdigest() for n in ['00_RAPPORT_PATCHES_R7.zip',*names]}
(out/'SHA256_R7.json').write_text(json.dumps({'commit':commit,'files':checks},indent=2)+'\n')
print(json.dumps({'commit':commit,'sourceFileCount':len(files),'tests':passed,'browser':8,'packages':[{'name':n,'bytes':(out/n).stat().st_size,'sha256':h} for n,h in checks.items()]},indent=2))
