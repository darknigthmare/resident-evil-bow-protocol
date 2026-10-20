#!/usr/bin/env python3
"""Package exact tracked source and executed QA. No main merge or deployment."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib,json,subprocess
R=Path(__file__).resolve().parents[1];O=R/'r15-delivery';O.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();base='4810b5e74f97e41f0fdddcec565246fa72003b01'
log=(R/'r15-verify.log').read_text();passed=sum(x.startswith('PASS ') for x in log.splitlines());assert passed==478 and not any(x.startswith('FAIL ') for x in log.splitlines()),passed
new=json.loads((R/'docs/BAKER_AUDIO_R15_TESTS.json').read_text());assert new['passed']==21 and new['failed']==0
browsers=[('qa-audio-r15-http/BROWSER_AUDIO_R15_RESULTS.json',10),('qa-baker-r14-http/BROWSER_BAKER_R14_RESULTS.json',8),('qa-replay-r13/BROWSER_REPLAY_R13_RESULTS.json',8),('qa-flight-r12/BROWSER_FLIGHT_R12_RESULTS.json',8),('qa-lucas-r11/BROWSER_LUCAS_R11_RESULTS.json',8),('qa-r10-http/R10_HTTP_RESULTS.json',22)]
for name,count in browsers:
 d=json.loads((R/name).read_text());assert d['passed']==count and d['failed']==0,(name,d)
raw=O/'BOW_R15_SOURCE.zip';subprocess.run(['git','archive','--format=zip','--prefix=bow-audio-r15/','-o',str(raw),'HEAD'],cwd=R,check=True)
files={}
with ZipFile(raw) as z,ZipFile(O/'01_CODE_R15.zip','w',ZIP_DEFLATED,compresslevel=6) as code:
 assert z.testzip() is None
 for item in z.infolist():
  if item.is_dir():continue
  rel=Path(item.filename).relative_to('bow-audio-r15').as_posix();b=z.read(item);files[rel]=hashlib.sha256(b).hexdigest()
  if not rel.startswith('assets/'):code.writestr(item.filename,b)
manifest={'revision':'R15','baseCommit':base,'sourceCommit':commit,'files':files,'fileCount':len(files),'executableChecks':passed,'newChecks':21,'httpScenarios':64,'newHttp':10,'originalRoomCompositions':3,'originalLayers':9,'loopSeconds':12,'canonicalSoundCertification':False,'physicalSpeakerTest':False,'subjectiveListening':False,'gameplayChanged':False,'replayContractsChanged':False}
with ZipFile(O/'00_REPORT_R15.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFEST_R15.json',json.dumps(manifest,indent=2)+'\n');z.writestr('R14_TO_R15.patch',subprocess.check_output(['git','diff','--binary',base,'HEAD'],cwd=R))
 for name in ['docs/BAKER_AUDIO_R15_SCOPE.md','docs/BAKER_AUDIO_R15_TESTS.json','docs/BAKER_AUDIO_R15_CHANGES.json','docs/BAKER_AUDIO_R15_PRESERVATION.json','docs/planning/README_R15.md','docs/planning/BOW_AMBIANCES_BAKER_R15.xlsx','r15-verify.log']:z.write(R/name,Path(name).name)
 for dirname in ['qa-audio-r15','qa-audio-r15-http','qa-baker-r14-http','qa-replay-r13','qa-flight-r12','qa-lucas-r11','qa-r10-http']:
  for p in (R/dirname).rglob('*'):
   if p.is_file():z.write(p,str(p.relative_to(R)))
for name in ['01_CODE_R15.zip','00_REPORT_R15.zip']:
 with ZipFile(O/name) as z:assert z.testzip() is None
print(json.dumps({'sourceCommit':commit,'fileCount':len(files),'executableChecks':passed,'httpScenarios':64},indent=2))
