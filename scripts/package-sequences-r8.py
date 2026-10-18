#!/usr/bin/env python3
"""Package exact tracked source, including dotfiles and the actual generated XLSX."""
from pathlib import Path
import hashlib,json,subprocess,zipfile,shutil
R=Path(__file__).resolve().parents[1];out=R/'r8-delivery';out.mkdir(exist_ok=True)
BASE='d79f9e3ce6d37f91ceb772f0bb457acf34efbf4d'
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
source=out/'BOW_PR11_R8_SOURCE_COMPLETE.zip'
subprocess.run(['git','archive','--format=zip','--prefix=bow-sequences-r8/','-o',str(source),'HEAD'],cwd=R,check=True)
parts=['01_CODE_ET_EXCEL_R8.zip','02_ASSETS_A_R8.zip','03_ASSETS_B_R8.zip'];sizes={n:0 for n in parts[1:]};manifest={}
zs={n:zipfile.ZipFile(out/n,'w',zipfile.ZIP_DEFLATED,compresslevel=6) for n in parts}
try:
 with zipfile.ZipFile(source) as z:
  assert z.testzip() is None
  for i in sorted((x for x in z.infolist() if not x.is_dir()),key=lambda x:x.compress_size,reverse=True):
   rel=str(Path(i.filename).relative_to('bow-sequences-r8'));data=z.read(i);manifest[rel]=hashlib.sha256(data).hexdigest()
   name=min(sizes,key=sizes.get) if rel.startswith('assets/') else parts[0]
   if name in sizes:sizes[name]+=i.compress_size
   zs[name].writestr(i.filename,data)
finally:
 for z in zs.values():z.close()
restored={}
for n in parts:
 assert (out/n).stat().st_size<90*1024*1024
 with zipfile.ZipFile(out/n) as z:
  assert z.testzip() is None
  for p in z.namelist():
   rel=str(Path(p).relative_to('bow-sequences-r8'));assert rel not in restored
   restored[rel]=hashlib.sha256(z.read(p)).hexdigest()
assert restored==manifest and any(x.startswith('.github/workflows/') for x in restored)
assert 'docs/planning/BOW_PR11_MATRICE_EXECUTION_R8.xlsx' in restored
m={'sourceCommit':commit,'baseCommit':BASE,'files':manifest,'sourceFiles':len(manifest),'gameplayVersion':'0.7.3','newCharacterArt':0,'sequenceSlots':2768,'stageConfigurations':52}
report=out/'00_RAPPORT_PATCH_R8.zip'
with zipfile.ZipFile(report,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFESTE_R8.json',json.dumps(m,indent=2,ensure_ascii=False)+'\n')
 z.writestr('BOW_R8_FROM_R7.patch',subprocess.check_output(['git','diff','--binary',BASE,'HEAD'],cwd=R))
 for p in ['docs/SEQUENCES_R8_SCOPE.md','docs/SEQUENCES_R8_TESTS.json','docs/SEQUENCES_R8_ADDITIONAL_TESTS.json','docs/PLANNING_INTEGRATION_R8_TESTS.json','docs/SEQUENCES_R8_CHANGES.json','docs/planning/MANIFESTE_EXECUTION_R8.json','docs/planning/README_R8.md','r8-verify.log']:
  if (R/p).is_file():z.write(R/p,Path(p).name)
 for folder in ['qa-sequences-r8','qa-planning-r8']:
  for p in (R/folder).glob('*'):
   if p.is_file():z.write(p,folder+'/'+p.name)
 z.writestr('verifier_reconstruction.py',"from pathlib import Path\nimport json,hashlib,sys\nh=Path(__file__).resolve().parent;m=json.loads((h/'MANIFESTE_R8.json').read_text());r=h/'bow-sequences-r8';bad=[p for p,s in m['files'].items() if not (r/p).is_file() or hashlib.sha256((r/p).read_bytes()).hexdigest()!=s];print(m['sourceCommit'],len(m['files']),bad);sys.exit(bool(bad))\n")
 z.writestr('LISEZ_MOI_R8.txt',f'B.O.W. Protocol PR11 / R8\nCommit: {commit}\nExtraire les quatre ZIP dans le meme dossier. Jeu sous bow-sequences-r8/. Verifier avec python verifier_reconstruction.py.\nPuis npm start ; http://localhost:5173/sequences.html\nExcel dans docs/planning/. Emplacements relies, dessins non produits.\nPR sans fusion ni promotion Vercel.\n')
checks={n:hashlib.sha256((out/n).read_bytes()).hexdigest() for n in [report.name,*parts]}
(out/'SHA256_R8.json').write_text(json.dumps({'commit':commit,'files':checks},indent=2)+'\n')
shutil.copy2(R/'docs/planning/BOW_PR11_MATRICE_EXECUTION_R8.xlsx',out)
print(json.dumps({'commit':commit,'verifiedFiles':len(manifest),'files':checks},indent=2))
