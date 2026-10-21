#!/usr/bin/env python3
"""Exact tracked source plus executed QA; no production deployment."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import json,subprocess,hashlib
R=Path(__file__).resolve().parents[1];O=R/'r18-delivery';O.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();base='86aa2637b03f1bc094e52339eb4ebf622aa0ce60'
log=(R/'r18-verify.log').read_text();passed=sum(x.startswith('PASS ') for x in log.splitlines());assert passed==554 and not any(x.startswith('FAIL ') for x in log.splitlines()),passed
new=json.loads((R/'docs/ACCESS_R18_TESTS.json').read_text());assert new['passed']==25 and new['failed']==0
browser=[('qa-access-r18/BROWSER_ACCESS_R18_RESULTS.json',10),('qa-combat-text-r17/BROWSER_COMBAT_TEXT_R17_RESULTS.json',12),('qa-trial-audio-r16/BROWSER_TRIAL_AUDIO_R16_RESULTS.json',12),('qa-audio-r15-http/BROWSER_AUDIO_R15_RESULTS.json',10),('qa-baker-r14-http/BROWSER_BAKER_R14_RESULTS.json',8),('qa-replay-r13/BROWSER_REPLAY_R13_RESULTS.json',8),('qa-flight-r12/BROWSER_FLIGHT_R12_RESULTS.json',8),('qa-lucas-r11/BROWSER_LUCAS_R11_RESULTS.json',8),('qa-r10-http/R10_HTTP_RESULTS.json',22)]
for p,n in browser:
 d=json.loads((R/p).read_text());assert d['passed']==n and d['failed']==0,(p,d)
raw=O/'BOW_R18_SOURCE.zip';subprocess.run(['git','archive','--format=zip','--prefix=bow-access-r18/','-o',str(raw),'HEAD'],cwd=R,check=True)
files={}
with ZipFile(raw) as z,ZipFile(O/'01_CODE_R18.zip','w',ZIP_DEFLATED,compresslevel=6) as out:
 assert z.testzip() is None
 for i in z.infolist():
  if i.is_dir():continue
  rel=Path(i.filename).relative_to('bow-access-r18').as_posix();b=z.read(i);files[rel]=hashlib.sha256(b).hexdigest()
  if not rel.startswith('assets/'):out.writestr(i.filename,b)
manifest={'revision':'R18','sourceCommit':commit,'base':base,'files':files,'fileCount':len(files),'executableChecks':passed,'newChecks':25,'httpScenarios':sum(n for p,n in browser),'newHTTP':10,'newArt':0,'physicalDevices':False,'screenReaderSpeechCertified':False,'gameplayContractsChanged':False}
with ZipFile(O/'00_REPORT_R18.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFEST_R18.json',json.dumps(manifest,indent=2)+'\n');z.writestr('R17_TO_R18.patch',subprocess.check_output(['git','diff','--binary',base,'HEAD'],cwd=R))
 for f in ['docs/ACCESS_R18_SCOPE.md','docs/ACCESS_R18_TESTS.json','docs/ACCESS_R18_PRESERVATION.json','docs/planning/README_R18.md','docs/planning/BOW_ACCESS_DOSSIERS_R18.xlsx','r18-verify.log']:z.write(R/f,Path(f).name)
 for d in dict.fromkeys(p.split('/')[0] for p,n in browser):
  for p in (R/d).rglob('*'):
   if p.is_file():z.write(p,str(p.relative_to(R)))
for f in ['01_CODE_R18.zip','00_REPORT_R18.zip']:
 with ZipFile(O/f) as z:assert z.testzip() is None
print(json.dumps({'commit':commit,'files':len(files),'tests':passed,'HTTP':manifest['httpScenarios']},indent=2))
