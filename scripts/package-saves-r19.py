#!/usr/bin/env python3
"""Package tracked candidate and executed evidence, with per-file SHA-256."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import subprocess,json,hashlib
R=Path(__file__).resolve().parents[1];O=R/'r19-delivery';O.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
log=(R/'r19-verify.log').read_text();count=sum(x.startswith('PASS ') for x in log.splitlines())
assert count>=579 and not any(x.startswith('FAIL ') for x in log.splitlines()),count
local=json.loads((R/'docs/SAVES_R19_TESTS.json').read_text());assert local['passed']==25 and not local['failed']
http=json.loads((R/'qa-saves-r19/BROWSER_SAVES_R19_RESULTS.json').read_text());assert http['passed']==16 and not http['failed']
paths=subprocess.check_output(['git','ls-files','-z'],cwd=R).decode().split('\0');paths=[p for p in paths if p]
manifest={'revision':'R19','sourceCommit':commit,'baseCommit':'f9dcf65c0b147be5942aba82ffbab738147d0481','executableChecks':count,'newChecks':25,'browserR19':16,'physicalDevice':False,'files':{p:hashlib.sha256((R/p).read_bytes()).hexdigest() for p in paths}}
with ZipFile(O/'01_CODE_R19.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 for name in paths:
  if not name.startswith('assets/'):z.write(R/name,'bow-saves-r19/'+name)
with ZipFile(O/'00_REPORT_R19.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFEST_R19.json',json.dumps(manifest,indent=2)+'\n')
 for name in ['r19-verify.log','docs/SAVES_R19_SCOPE.md','docs/SAVES_R19_TESTS.json','docs/SAVES_R19_PRESERVATION.json','docs/planning/BOW_SAUVEGARDES_R19.xlsx']:z.write(R/name,Path(name).name)
 for folder in ['qa-saves-r19','qa-access-r18','qa-combat-text-r17','qa-replay-r13']:
  if (R/folder).exists():
   for p in (R/folder).rglob('*'):
    if p.is_file():z.write(p,str(p.relative_to(R)))
print(json.dumps({'commit':commit,'files':len(paths),'checks':count,'R19_HTTP':16},indent=2))
