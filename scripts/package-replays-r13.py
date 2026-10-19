#!/usr/bin/env python3
"""Archive exact tested source and executed evidence; never publish production."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import subprocess,json,hashlib
R=Path(__file__).resolve().parents[1];O=R/'r13-delivery';O.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();base='31671fecf53a26d81f77d2cb13a5ff61f15ef363'
log=(R/'r13-verify.log').read_text();passed=sum(x.startswith('PASS ') for x in log.splitlines());assert passed==437 and not any(x.startswith('FAIL ') for x in log.splitlines()),passed
new=json.loads((R/'docs/REPLAY_R13_TESTS.json').read_text());assert new['passed']==26 and new['failed']==0
for p,count in [('qa-replay-r13/BROWSER_REPLAY_R13_RESULTS.json',8),('qa-flight-r12/BROWSER_FLIGHT_R12_RESULTS.json',8),('qa-lucas-r11/BROWSER_LUCAS_R11_RESULTS.json',8),('qa-r10-http/R10_HTTP_RESULTS.json',22)]:
 d=json.loads((R/p).read_text());assert d['passed']==count and d['failed']==0,(p,d)
raw=O/'BOW_R13_SOURCE.zip';subprocess.run(['git','archive','--format=zip','--prefix=bow-replays-r13/','-o',str(raw),'HEAD'],cwd=R,check=True)
files={}
with ZipFile(raw) as z,ZipFile(O/'01_CODE_R13.zip','w',ZIP_DEFLATED,compresslevel=6) as code:
 assert z.testzip() is None
 for i in z.infolist():
  if i.is_dir():continue
  rel=Path(i.filename).relative_to('bow-replays-r13').as_posix();b=z.read(i);files[rel]=hashlib.sha256(b).hexdigest()
  if not rel.startswith('assets/'):code.writestr(i.filename,b)
manifest={'revision':'R13','base':base,'sourceCommit':commit,'files':files,'fileCount':len(files),'executableChecks':passed,'newChecks':26,'browserR13':8,'browserFlight':8,'browserLucas':8,'browserR10':22,'newArt':0,'changedProfiles':[],'physicalDevices':False}
with ZipFile(O/'00_REPORT_R13.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFEST_R13.json',json.dumps(manifest,indent=2)+'\n');z.writestr('R12_TO_R13.patch',subprocess.check_output(['git','diff','--binary',base,'HEAD'],cwd=R))
 for f in ['docs/REPLAY_R13_SCOPE.md','docs/REPLAY_R13_TESTS.json','docs/REPLAY_R13_CHANGES.json','docs/REPLAY_R13_PRESERVATION.json','docs/planning/BOW_REPLAYS_R13.xlsx','r13-verify.log']:z.write(R/f,Path(f).name)
 for directory in ['qa-replay-r13','qa-flight-r12','qa-lucas-r11','qa-r10-http']:
  for p in (R/directory).rglob('*'):
   if p.is_file():z.write(p,str(p.relative_to(R)))
for f in ['01_CODE_R13.zip','00_REPORT_R13.zip']:
 with ZipFile(O/f) as z:assert z.testzip() is None
print(json.dumps({'commit':commit,'files':len(files),'tests':passed,'httpScenarios':46},indent=2))
