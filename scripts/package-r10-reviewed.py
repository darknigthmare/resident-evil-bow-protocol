#!/usr/bin/env python3
"""Package exact tracked files, including dotfiles, plus honest executed evidence."""
from pathlib import Path
import subprocess,hashlib,json,zipfile
R=Path(__file__).resolve().parents[1];out=R/'r10-delivery';out.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
base='58b311b73a7890fe55a073515e5a2cbf2009a6b8'
files=[n for n in subprocess.check_output(['git','ls-files','-z'],cwd=R).decode().split('\0') if n]
manifest={};names=['01_CODE_R10.zip','02_ASSETS_A_R10.zip','03_ASSETS_B_R10.zip'];sizes={n:0 for n in names[1:]};groups={n:[] for n in names}
archives={n:zipfile.ZipFile(out/n,'w',zipfile.ZIP_DEFLATED,compresslevel=6) for n in names}
try:
 for n in sorted(files):
  data=subprocess.check_output(['git','show',commit+':'+n],cwd=R);manifest[n]=hashlib.sha256(data).hexdigest()
  dest=min(sizes,key=sizes.get) if n.startswith('assets/') else names[0]
  if dest in sizes:sizes[dest]+=len(data)
  archives[dest].writestr('bow-integrated-r10/'+n,data);groups[dest].append(n)
finally:
 for z in archives.values():z.close()
verified={}
for n in names:
 assert (out/n).stat().st_size<95*1024*1024
 with zipfile.ZipFile(out/n) as z:
  assert z.testzip() is None
  for k in z.namelist():
   name=str(Path(k).relative_to('bow-integrated-r10'));assert name not in verified
   verified[name]=hashlib.sha256(z.read(k)).hexdigest()
assert verified==manifest and '.github/workflows/ci.yml' in verified
with zipfile.ZipFile(out/'00_REPORT_R10.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('MANIFEST_R10.json',json.dumps({'commit':commit,'base':base,'fileCount':len(files),'files':manifest,'parts':groups},indent=2)+'\n')
 z.writestr('R9_TO_R10.patch',subprocess.check_output(['git','diff','--binary',base,commit],cwd=R))
 for n in ['r10-verify.log','docs/DELIVERY_R10_TESTS.json','docs/FINISHER_MATRIX_R10.json','docs/INTEGRATION_R10.md','docs/planning/BOW_PR11_SUIVI_R10.xlsx']:
  z.write(R/n,n)
 for folder in ['qa-r10-http','qa-audit-r9','qa-sequences-r8']:
  for p in (R/folder).rglob('*'):
   if p.is_file():z.write(p,p.relative_to(R).as_posix())
checks={n:hashlib.sha256((out/n).read_bytes()).hexdigest() for n in ['00_REPORT_R10.zip',*names]}
(out/'SHA256_R10.json').write_text(json.dumps({'commit':commit,'files':checks},indent=2)+'\n')
print(json.dumps({'commit':commit,'verifiedFiles':len(files),'packages':checks},indent=2))
