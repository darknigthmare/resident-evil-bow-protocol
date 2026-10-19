#!/usr/bin/env python3
"""Archive exact tracked source and executed evidence. No public deployment."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import subprocess,json,hashlib
R=Path(__file__).resolve().parents[1];O=R/'r12-delivery';O.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();base='355d545e08327d3cea0af20d3c0248de0e3364a5'
log=(R/'r12-verify.log').read_text();passed=sum(x.startswith('PASS ') for x in log.splitlines());assert passed==411 and not any(x.startswith('FAIL ') for x in log.splitlines()),passed
new=json.loads((R/'docs/FLIGHT_R12_TESTS.json').read_text());assert new['passed']==19 and new['failed']==0
for p,count in [('qa-flight-r12/BROWSER_FLIGHT_R12_RESULTS.json',8),('qa-lucas-r11/BROWSER_LUCAS_R11_RESULTS.json',8),('qa-r10-http/R10_HTTP_RESULTS.json',22)]:
 d=json.loads((R/p).read_text());assert d['passed']==count and d['failed']==0,(p,d)
raw=O/'BOW_R12_SOURCE.zip';subprocess.run(['git','archive','--format=zip','--prefix=bow-flight-r12/','-o',str(raw),'HEAD'],cwd=R,check=True)
files={}
with ZipFile(raw) as z,ZipFile(O/'01_CODE_R12.zip','w',ZIP_DEFLATED,compresslevel=6) as code:
 assert z.testzip() is None
 for i in z.infolist():
  if i.is_dir():continue
  rel=Path(i.filename).relative_to('bow-flight-r12').as_posix();b=z.read(i);files[rel]=hashlib.sha256(b).hexdigest()
  if not rel.startswith('assets/'):code.writestr(i.filename,b)
manifest={'revision':'R12','base':base,'sourceCommit':commit,'files':files,'fileCount':len(files),'executableChecks':passed,'newChecks':19,'browserFlight':8,'browserLucas':8,'browserR10':22,'changedMainProfiles':['re7-flying-bug'],'preservedMainProfiles':114,'coreEngineChanged':False,'newFinalArt':0,'physicalDevices':False}
with ZipFile(O/'00_REPORT_R12.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFEST_R12.json',json.dumps(manifest,indent=2)+'\n');z.writestr('R11_TO_R12.patch',subprocess.check_output(['git','diff','--binary',base,'HEAD'],cwd=R))
 for f in ['docs/FLIGHT_R12_SCOPE.md','docs/FLIGHT_R12_TESTS.json','docs/FLIGHT_R12_CHANGES.json','docs/FLIGHT_R12_PRESERVATION.json','docs/planning/BOW_FLIGHT_R12.xlsx','r12-verify.log']:z.write(R/f,Path(f).name)
 for directory in ['qa-flight-r12','qa-lucas-r11','qa-r10-http']:
  for p in (R/directory).rglob('*'):
   if p.is_file():z.write(p,str(p.relative_to(R)))
for file in ['01_CODE_R12.zip','00_REPORT_R12.zip']:
 with ZipFile(O/file) as z:assert z.testzip() is None
print(json.dumps({'commit':commit,'files':len(files),'tests':passed,'httpScenarios':38},indent=2))
