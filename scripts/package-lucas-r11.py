#!/usr/bin/env python3
"""Exact tracked source plus executed evidence; no release publication."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib,json,subprocess
R=Path(__file__).resolve().parents[1];O=R/'r11-delivery';O.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();base='b8b47ee78b80015263f10303781ae2566eb27699'
log=(R/'r11-verify.log').read_text();passed=sum(x.startswith('PASS ') for x in log.splitlines());assert passed==392,passed
new=json.loads((R/'docs/LUCAS_R11_TESTS.json').read_text());assert new['passed']==22 and new['failed']==0
continuity=json.loads((R/'docs/LUCAS_R11_CONTINUITY_TESTS.json').read_text());assert continuity['passed']==4 and continuity['failed']==0
browser=json.loads((R/'qa-lucas-r11/BROWSER_LUCAS_R11_RESULTS.json').read_text());assert browser['passed']==8 and browser['failed']==0
old=json.loads((R/'qa-r10-http/R10_HTTP_RESULTS.json').read_text());assert old['passed']==22 and old['failed']==0
raw=O/'BOW_R11_SOURCE.zip';subprocess.run(['git','archive','--format=zip','--prefix=bow-lucas-r11/','-o',str(raw),'HEAD'],cwd=R,check=True)
parts=['01_CODE_EXCEL_R11.zip','02_ASSETS_A_R11.zip','03_ASSETS_B_R11.zip'];zips={n:ZipFile(O/n,'w',ZIP_DEFLATED,compresslevel=6) for n in parts};sizes=[0,0];files={}
try:
 with ZipFile(raw) as z:
  assert z.testzip() is None
  for i in sorted((i for i in z.infolist() if not i.is_dir()),key=lambda i:i.compress_size,reverse=True):
   name=Path(i.filename).relative_to('bow-lucas-r11').as_posix();b=z.read(i);files[name]=hashlib.sha256(b).hexdigest()
   if name.startswith('assets/'):
    k=0 if sizes[0]<=sizes[1] else 1;sizes[k]+=i.compress_size;target=parts[k+1]
   else:target=parts[0]
   zips[target].writestr(i.filename,b)
finally:
 for z in zips.values():z.close()
manifest={'revision':'R11','base':base,'sourceCommit':commit,'files':files,'fileCount':len(files),'executableChecks':passed,'newChecks':26,'browserR11':8,'browserR10':22,'physicalHardware':False,'changedMainProfiles':['re7-lucas-baker'],'preservedMainProfiles':114,'newCharacterArt':0,'canonCertification':False}
with ZipFile(O/'00_REPORT_R11.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFEST_R11.json',json.dumps(manifest,indent=2)+'\n');z.writestr('R10_MAIN_TO_R11.patch',subprocess.check_output(['git','diff','--binary',base,'HEAD'],cwd=R))
 for f in ['docs/LUCAS_R11_SCOPE.md','docs/LUCAS_R11_TESTS.json','docs/LUCAS_R11_PRESERVATION.json','docs/LUCAS_R11_CHANGES.json','docs/LUCAS_R11_CONTINUITY_TESTS.json','docs/LUCAS_R11_STORY_PRESERVATION.json','docs/INTEGRATION_R11.md','docs/planning/BOW_LUCAS_DISPOSITIFS_R11.xlsx','r11-verify.log']:
  z.write(R/f,Path(f).name)
 for directory in ['qa-lucas-r11','qa-r10-http']:
  for p in (R/directory).rglob('*'):
   if p.is_file():z.write(p,str(p.relative_to(R)))
for name in parts:
 with ZipFile(O/name) as z:assert z.testzip() is None
sha={n:hashlib.sha256((O/n).read_bytes()).hexdigest() for n in ['00_REPORT_R11.zip',*parts]};(O/'SHA256_R11.json').write_text(json.dumps({'commit':commit,'files':sha},indent=2)+'\n')
print(json.dumps({'commit':commit,'files':len(files),'tests':passed,'browser':30,'packages':[{n:(O/n).stat().st_size} for n in sha]},indent=2))
