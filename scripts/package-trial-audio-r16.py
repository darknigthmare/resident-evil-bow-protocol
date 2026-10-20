#!/usr/bin/env python3
"""Package exact tracked source and executed evidence. No deployment or merge."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib,json,subprocess
R=Path(__file__).resolve().parents[1];O=R/'r16-delivery';O.mkdir(exist_ok=True)
base='f214d9d4c367a8be861bf556866dc211ea9334b1';commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
log=(R/'r16-verify.log').read_text();passed=sum(x.startswith('PASS ') for x in log.splitlines());assert passed==503 and not any(x.startswith('FAIL ') for x in log.splitlines()),passed
new=json.loads((R/'docs/TRIAL_AUDIO_R16_TESTS.json').read_text());assert new['passed']==25 and new['failed']==0
browser={}
for directory,filename,count in [('qa-trial-audio-r16','BROWSER_TRIAL_AUDIO_R16_RESULTS.json',12),('qa-audio-r15-http','BROWSER_BAKER_AUDIO_R15_RESULTS.json',10),('qa-baker-r14-http','BROWSER_BAKER_R14_RESULTS.json',8),('qa-replay-r13','BROWSER_REPLAY_R13_RESULTS.json',8),('qa-flight-r12','BROWSER_FLIGHT_R12_RESULTS.json',8),('qa-lucas-r11','BROWSER_LUCAS_R11_RESULTS.json',8),('qa-r10-http','R10_HTTP_RESULTS.json',22)]:
 p=R/directory/filename
 if not p.exists():
  candidates=list((R/directory).glob('*.json'));assert len(candidates)==1,(directory,candidates);p=candidates[0]
 d=json.loads(p.read_text());assert d['passed']==count and d['failed']==0,(p,d)
 browser[directory]={'passed':d['passed'],'failed':d['failed'],'report':str(p.relative_to(R))}
raw=O/'BOW_R16_SOURCE.zip';subprocess.run(['git','archive','--format=zip','--prefix=bow-duel-audio-r16/','-o',str(raw),'HEAD'],cwd=R,check=True);files={}
with ZipFile(raw) as z,ZipFile(O/'01_CODE_R16.zip','w',ZIP_DEFLATED,compresslevel=6) as code:
 assert z.testzip() is None
 for item in z.infolist():
  if item.is_dir():continue
  p=Path(item.filename).relative_to('bow-duel-audio-r16').as_posix();b=z.read(item);files[p]=hashlib.sha256(b).hexdigest()
  if not p.startswith('assets/'):code.writestr(item.filename,b)
manifest={'revision':'R16','base':base,'sourceCommit':commit,'files':files,'fileCount':len(files),'executableChecks':passed,'newChecks':25,'browser':browser,'browserTotal':sum(v['passed']for v in browser.values()),'newCharacterArt':0,'gameplayOrReplayContractsChanged':False,'physicalDevices':False,'canonAudio':False}
with ZipFile(O/'00_REPORT_R16.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFEST_R16.json',json.dumps(manifest,indent=2)+'\n');z.writestr('R15_TO_R16.patch',subprocess.check_output(['git','diff','--binary',base,'HEAD'],cwd=R))
 for p in ['docs/TRIAL_AUDIO_R16_SCOPE.md','docs/TRIAL_AUDIO_R16_TESTS.json','docs/TRIAL_AUDIO_R16_PRESERVATION.json','docs/TRIAL_AUDIO_R16_CHANGES.json','docs/planning/BOW_DUELS_AUDIO_R16.xlsx','docs/planning/README_R16.md','r16-verify.log']:z.write(R/p,Path(p).name)
 for directory in browser:
  for p in (R/directory).rglob('*'):
   if p.is_file():z.write(p,str(p.relative_to(R)))
for p in ['00_REPORT_R16.zip','01_CODE_R16.zip']:
 with ZipFile(O/p) as z:assert z.testzip() is None
print(json.dumps({'sourceCommit':commit,'files':len(files),'tests':passed,'http':manifest['browserTotal']},indent=2))
