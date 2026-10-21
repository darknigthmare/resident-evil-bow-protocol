#!/usr/bin/env python3
"""Exact tracked source plus executed QA; no production deployment."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import json,subprocess,hashlib
R=Path(__file__).resolve().parents[1];O=R/'r17-delivery';O.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();base='0663f925b2cba8fbe3b42fc2f0dbcf7f2a2e70ef'
log=(R/'r17-verify.log').read_text();passed=sum(x.startswith('PASS ') for x in log.splitlines());assert passed==529 and not any(x.startswith('FAIL ') for x in log.splitlines()),passed
new=json.loads((R/'docs/COMBAT_TEXT_R17_TESTS.json').read_text());assert new['passed']==26 and new['failed']==0
browser=[('qa-combat-text-r17/BROWSER_COMBAT_TEXT_R17_RESULTS.json',12),('qa-trial-audio-r16/BROWSER_TRIAL_AUDIO_R16_RESULTS.json',12),('qa-audio-r15-http/BROWSER_AUDIO_R15_RESULTS.json',10),('qa-baker-r14-http/BROWSER_BAKER_R14_RESULTS.json',8),('qa-replay-r13/BROWSER_REPLAY_R13_RESULTS.json',8),('qa-flight-r12/BROWSER_FLIGHT_R12_RESULTS.json',8),('qa-lucas-r11/BROWSER_LUCAS_R11_RESULTS.json',8),('qa-r10-http/R10_HTTP_RESULTS.json',22)]
for p,n in browser:
 d=json.loads((R/p).read_text());assert d['passed']==n and d['failed']==0,(p,d)
raw=O/'BOW_R17_SOURCE.zip';subprocess.run(['git','archive','--format=zip','--prefix=bow-text-r17/','-o',str(raw),'HEAD'],cwd=R,check=True)
files={}
with ZipFile(raw) as z,ZipFile(O/'01_CODE_R17.zip','w',ZIP_DEFLATED,compresslevel=6) as out:
 assert z.testzip() is None
 for i in z.infolist():
  if i.is_dir():continue
  rel=Path(i.filename).relative_to('bow-text-r17').as_posix();b=z.read(i);files[rel]=hashlib.sha256(b).hexdigest()
  if not rel.startswith('assets/'):out.writestr(i.filename,b)
manifest={'revision':'R17','sourceCommit':commit,'base':base,'files':files,'fileCount':len(files),'executableChecks':passed,'newChecks':26,'httpScenarios':sum(n for p,n in browser),'newHTTP':12,'newArt':0,'physicalDevices':False,'screenReaderSpeechCertified':False,'gameplayContractsChanged':False}
with ZipFile(O/'00_REPORT_R17.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFEST_R17.json',json.dumps(manifest,indent=2)+'\n');z.writestr('R16_TO_R17.patch',subprocess.check_output(['git','diff','--binary',base,'HEAD'],cwd=R))
 for f in ['docs/COMBAT_TEXT_R17_SCOPE.md','docs/COMBAT_TEXT_R17_TESTS.json','docs/COMBAT_TEXT_R17_CHANGES.json','docs/COMBAT_TEXT_R17_PRESERVATION.json','docs/planning/BOW_REPERES_COMBAT_R17.xlsx','r17-verify.log']:z.write(R/f,Path(f).name)
 for d in dict.fromkeys(p.split('/')[0] for p,n in browser):
  for p in (R/d).rglob('*'):
   if p.is_file():z.write(p,str(p.relative_to(R)))
for f in ['01_CODE_R17.zip','00_REPORT_R17.zip']:
 with ZipFile(O/f) as z:assert z.testzip() is None
print(json.dumps({'commit':commit,'files':len(files),'tests':passed,'HTTP':manifest['httpScenarios']},indent=2))
