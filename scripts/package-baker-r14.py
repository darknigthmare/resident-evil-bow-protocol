#!/usr/bin/env python3
"""Exact candidate source plus executed test/visual evidence; not a deployment."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib,json,subprocess
R=Path(__file__).resolve().parents[1];O=R/'r14-delivery';O.mkdir(exist_ok=True);base='c505206a06c63843533cfca046cf06544b9e1e28'
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();log=(R/'r14-verify.log').read_text();count=sum(s.startswith('PASS ') for s in log.splitlines());assert count==457 and not any(s.startswith('FAIL ') for s in log.splitlines()),count
new=json.loads((R/'docs/BAKER_R14_TESTS.json').read_text());assert new['passed']==20 and new['failed']==0
browsers={}
for f,n in [('qa-baker-r14-http/BROWSER_BAKER_R14_RESULTS.json',8),('qa-replay-r13/BROWSER_REPLAY_R13_RESULTS.json',8),('qa-flight-r12/BROWSER_FLIGHT_R12_RESULTS.json',8),('qa-lucas-r11/BROWSER_LUCAS_R11_RESULTS.json',8),('qa-r10-http/R10_HTTP_RESULTS.json',22)]:
 if f.startswith('qa-replay') and not (R/f).exists():
  options=list((R/'qa-replay-r13').glob('*.json'));assert len(options)==1;f=options[0].relative_to(R).as_posix()
 d=json.loads((R/f).read_text());assert d['passed']==n and d['failed']==0,(f,d);browsers[f]=n
archive=O/'BOW_R14_SOURCE.zip';subprocess.run(['git','archive','--format=zip','--prefix=bow-baker-r14/','-o',str(archive),'HEAD'],cwd=R,check=True);files={}
with ZipFile(archive) as z,ZipFile(O/'01_CODE_R14.zip','w',ZIP_DEFLATED,compresslevel=6) as out:
 assert z.testzip() is None
 for i in z.infolist():
  if i.is_dir():continue
  rel=Path(i.filename).relative_to('bow-baker-r14').as_posix();b=z.read(i);files[rel]=hashlib.sha256(b).hexdigest()
  if not rel.startswith('assets/'):out.writestr(i.filename,b)
manifest={'revision':'R14','sourceCommit':commit,'base':base,'files':files,'fileCount':len(files),'executableChecks':count,'newChecks':20,'browserScenarios':browsers,'newStageConfigurations':0,'recomposedRooms':3,'originalProceduralArtwork':True,'canonCertified':False,'changedFighterProfiles':0,'physicalDevices':False}
with ZipFile(O/'00_REPORT_R14.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFEST_R14.json',json.dumps(manifest,indent=2)+'\n');z.writestr('R13_TO_R14.patch',subprocess.check_output(['git','diff','--binary',base,'HEAD'],cwd=R))
 for f in ['docs/BAKER_R14_SCOPE.md','docs/BAKER_R14_CHANGES.json','docs/BAKER_R14_PRESERVATION.json','docs/BAKER_R14_TESTS.json','r14-verify.log']:z.write(R/f,Path(f).name)
 for directory in ['qa-baker-r14','qa-baker-r14-http','qa-replay-r13','qa-flight-r12','qa-lucas-r11','qa-r10-http']:
  for p in (R/directory).rglob('*'):
   if p.is_file():z.write(p,p.relative_to(R).as_posix())
print(json.dumps({'commit':commit,'files':len(files),'tests':count,'browser':sum(browsers.values())},indent=2))
