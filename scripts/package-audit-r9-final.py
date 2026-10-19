#!/usr/bin/env python3
"""Package tracked cumulative source after QA; verify every reconstructed byte."""
from pathlib import Path
import subprocess,zipfile,hashlib,json
R=Path(__file__).resolve().parents[1];O=R/'r9-delivery';O.mkdir(exist_ok=True)
BASE='ba4e3cc82f2c9af7c7324420a0cc4409c599fd1a';commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
result_files=['tests/engine-results.json','tests/pages-results.json','tests/ui-results.json']+[f'tests/v{v}-results.json' for v in ['060','061','070','071','072','073']]+['docs/'+n for n in ['DIRECTIONAL_TESTS.json','DIRECTIONAL_ANIMATION_TESTS.json','DIRECTIONAL_R3_TESTS.json','DIRECTIONAL_R4_TESTS.json','RENDERER_RECOVERY_R5_TESTS.json','COMBAT_STAGE_R6_TESTS.json','CATALOG_REPLAY_R7_TESTS.json','SEQUENCES_R8_TESTS.json','SEQUENCES_R8_ADDITIONAL_TESTS.json','PLANNING_INTEGRATION_R8_TESTS.json','AUDIT_R9_TESTS.json']]
results=[]
for name in result_files:
 d=json.loads((R/name).read_text());fail=d.get('failed',d.get('failures',0));passed=d.get('passed',0) if name!='tests/ui-results.json' else d['checks']-fail
 assert isinstance(passed,int) and passed>0 and fail==0,name
 results.append({'path':name,'passed':passed,'failed':fail})
assert sum(r['passed'] for r in results)==350
browsers={}
for folder,file in [('qa-audit-r9','BROWSER_AUDIT_R9_RESULTS.json'),('qa-sequences-r8','BROWSER_R8_RESULTS.json')]:
 d=json.loads((R/folder/file).read_text());assert d['failed']==0;browsers[folder]={'passed':d['passed'],'failed':0}
assert browsers['qa-audit-r9']['passed']==10
source=O/'BOW_PR11_R9_SOURCE_COMPLETE.zip';subprocess.run(['git','archive','--format=zip','--prefix=bow-audit-r9/','-o',str(source),'HEAD'],cwd=R,check=True)
partnames=['01_CODE_ET_EXCEL_R9.zip','02_ASSETS_A_R9.zip','03_ASSETS_B_R9.zip'];parts={n:zipfile.ZipFile(O/n,'w',zipfile.ZIP_DEFLATED,compresslevel=6) for n in partnames};sizes={n:0 for n in partnames[1:]};manifest={}
try:
 with zipfile.ZipFile(source) as z:
  assert z.testzip() is None
  for e in sorted((x for x in z.infolist() if not x.is_dir()),key=lambda x:x.compress_size,reverse=True):
   rel=str(Path(e.filename).relative_to('bow-audit-r9'));data=z.read(e);manifest[rel]=hashlib.sha256(data).hexdigest();part=min(sizes,key=sizes.get) if rel.startswith('assets/') else partnames[0]
   if part in sizes:sizes[part]+=e.compress_size
   parts[part].writestr(e.filename,data)
finally:
 for z in parts.values():z.close()
recovered={}
for name in partnames:
 assert (O/name).stat().st_size<90*1024*1024
 with zipfile.ZipFile(O/name) as z:
  assert z.testzip() is None
  for e in z.namelist():
   rel=str(Path(e).relative_to('bow-audit-r9'));assert rel not in recovered;recovered[rel]=hashlib.sha256(z.read(e)).hexdigest()
assert recovered==manifest
assert any(n.startswith('.github/workflows/') for n in manifest)
assert 'docs/planning/BOW_PR11_CLOTURES_AUDIT_R9.xlsx' in manifest
summary={'sourceCommit':commit,'baseCommit':BASE,'sourceFiles':len(manifest),'gameplayVersion':'0.7.3','revision':'R9','closedTechnicalDefects':['AUD-01','AUD-02','AUD-03','AUD-04','AUD-05','AUD-06'],'globalArtLotsClosed':0,'actualBFCacheObserved':False,'totalExecutableChecks':350,'results':results,'browserRuns':browsers,'files':manifest}
report=O/'00_RAPPORT_PATCHES_R9.zip'
with zipfile.ZipFile(report,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFESTE_R9.json',json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 z.writestr('BOW_PR11_R8_TO_R9.patch',subprocess.check_output(['git','diff','--binary',BASE,'HEAD'],cwd=R))
 z.writestr('verifier_reconstruction.py',"from pathlib import Path\nimport hashlib,json,sys\nr=Path(__file__).resolve().parent;m=json.loads((r/'MANIFESTE_R9.json').read_text());s=r/'bow-audit-r9';bad=[p for p,h in m['files'].items() if not (s/p).is_file() or hashlib.sha256((s/p).read_bytes()).hexdigest()!=h];print('Commit:',m['sourceCommit'],'Files:',len(m['files']),'Errors:',bad);sys.exit(bool(bad))\n")
 z.writestr('LISEZ_MOI_R9.txt',f'''B.O.W. PROTOCOL — PR11 / R9\nCommit source: {commit}\nExtraire les quatre ZIP dans un meme dossier. Le jeu est sous bow-audit-r9/.\nVerifier: python verifier_reconstruction.py\nLancer dans bow-audit-r9/: npm start\nOuvrir http://localhost:5173/\nExcel: docs/planning/BOW_PR11_CLOTURES_AUDIT_R9.xlsx\nSix correctifs techniques : clavier, Gamepad, raccourcis, conclusions, outro et audio.\nPas de nouveau dessin final ni de repertoire canonique. Retour BFCache reel non certifie.\nLa PR reste ouverte, sans fusion main ni promotion Vercel. Aucun upload Drive revendique.\n''')
 for name in result_files+['docs/AUDIT_R8_BEFORE_R9.json','docs/AUDIT_R9_SCOPE.md','docs/AUDIT_R9_PRESERVATION.json','docs/planning/README_R9.md','r9-final-verify.log']:
  z.write(R/name,'preuves/'+name)
 for folder in browsers:
  for file in sorted((R/folder).glob('*')):
   if file.is_file():z.write(file,'preuves/'+folder+'/'+file.name)
for name in ['00_RAPPORT_PATCHES_R9.zip',*partnames]:
 with zipfile.ZipFile(O/name) as z:assert z.testzip() is None
hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [source,report,*[O/n for n in partnames]]}
(O/'SHA256_R9.json').write_text(json.dumps({'sourceCommit':commit,'hashes':hashes},indent=2)+'\n')
print(json.dumps({'sourceCommit':commit,'sourceFiles':len(manifest),'totalExecutableChecks':350,'browsers':browsers,'hashes':hashes},indent=2))
