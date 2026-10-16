#!/usr/bin/env python3
"""Archive tracked source only; wrap bounded ZIPs before Actions upload."""
from pathlib import Path
import hashlib,json,subprocess,zipfile
R=Path(__file__).resolve().parents[1];out=R/'r5-delivery';out.mkdir(exist_ok=True)
BASE='218c31c371e6caf0877667389b8d160d3f257b9f'
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
source=out/'BOW_PROTOCOL_PR11_R5_SOURCE.zip'
subprocess.run(['git','archive','--format=zip','--prefix=bow-renderer-r5/','-o',str(source),'HEAD'],cwd=R,check=True)
names=['01_CODE_R5.zip','02_ASSETS_A_R5.zip','03_ASSETS_B_R5.zip'];members={name:[] for name in names};sizes={name:0 for name in names[1:]};manifest={}
archives={name:zipfile.ZipFile(out/name,'w',zipfile.ZIP_DEFLATED,compresslevel=6) for name in names}
try:
 with zipfile.ZipFile(source) as z:
  assert z.testzip() is None
  for item in sorted((i for i in z.infolist() if not i.is_dir()),key=lambda i:i.compress_size,reverse=True):
   rel=str(Path(item.filename).relative_to('bow-renderer-r5'));data=z.read(item);manifest[rel]=hashlib.sha256(data).hexdigest()
   group=min(sizes,key=sizes.get) if rel.startswith('assets/') else names[0]
   if group in sizes:sizes[group]+=item.compress_size
   archives[group].writestr(item.filename,data);members[group].append(rel)
finally:
 for z in archives.values():z.close()
# Verify the ZIPs actually transported, including dotfiles, not their staging directories.
recovered={}
for name in names:
 assert (out/name).stat().st_size<90*1024*1024
 with zipfile.ZipFile(out/name) as z:
  assert z.testzip() is None
  for item in z.namelist():
   rel=str(Path(item).relative_to('bow-renderer-r5'));assert rel not in recovered
   recovered[rel]=hashlib.sha256(z.read(item)).hexdigest()
assert recovered==manifest
assert any(p.startswith('.github/workflows/') for p in recovered),'Workflow files missing from backup'
report={'sourceCommit':commit,'baseCommit':BASE,'sourceFiles':len(manifest),'hiddenFilesPreserved':[p for p in manifest if any(part.startswith('.') for part in Path(p).parts)],'files':manifest,'parts':members,'gameplay':'0.7.3','artRevision':4}
with zipfile.ZipFile(out/'00_RAPPORT_PATCHES_R5.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFESTE_R5.json',json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 z.writestr('verifier_reconstruction.py',"from pathlib import Path\nimport json,hashlib,sys\nh=Path(__file__).resolve().parent;m=json.loads((h/'MANIFESTE_R5.json').read_text());root=h/'bow-renderer-r5';errors=[n for n,s in m['files'].items() if not (root/n).is_file() or hashlib.sha256((root/n).read_bytes()).hexdigest()!=s];print('Commit:',m['sourceCommit'],'Files:',len(m['files']),'Errors:',errors);sys.exit(bool(errors))\n")
 for file in ['docs/RENDERER_RECOVERY_R5_SCOPE.md','docs/RENDERER_RECOVERY_R5_TESTS.json','docs/RENDERER_RECOVERY_R5_BASELINE.json','docs/DIRECTIONAL_R4_SCOPE.md','docs/DIRECTIONAL_R4_TESTS.json','r5-verify.log']:
  if (R/file).is_file():z.write(R/file,Path(file).name)
 for folder in ['qa-directional-r4','qa-renderer-r5']:
  for file in sorted((R/folder).glob('*')):
   if file.is_file():z.write(file,folder+'/'+file.name)
 z.writestr('BOW_R5_FROM_R4.patch',subprocess.check_output(['git','diff','--binary',BASE,'HEAD'],cwd=R))
 z.writestr('LISEZ_MOI_R5.txt',f'''B.O.W. PROTOCOL — PR11 / R5\nCommit source: {commit}\nExtraire les quatre ZIP dans un meme dossier.\nLe jeu est sous bow-renderer-r5/. Lancer python verifier_reconstruction.py puis npm start dans le dossier du jeu.\nOuvrir http://localhost:5173/directions.html.\nCe pack conserve R4 et ajoute la reprise des images en erreur. Pas de nouvelle illustration ou animation finale.\nPR ouverte en brouillon, sans fusion ni deploiement Vercel.\n''')
for name in ['00_RAPPORT_PATCHES_R5.zip',*names]:
 with zipfile.ZipFile(out/name) as z:assert z.testzip() is None
checks={name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in ['00_RAPPORT_PATCHES_R5.zip',*names]}
(out/'SHA256_R5.json').write_text(json.dumps({'sourceCommit':commit,'files':checks},indent=2)+'\n')
print(json.dumps({'sourceCommit':commit,'verifiedSourceFiles':len(manifest),'hiddenFiles':len(report['hiddenFilesPreserved']),'files':[{'name':n,'bytes':(out/n).stat().st_size,'sha256':s} for n,s in checks.items()]},indent=2))
