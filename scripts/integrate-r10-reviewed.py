#!/usr/bin/env python3
"""Install reviewed R10 text and original workbook components; no network reads."""
from pathlib import Path
import base64,hashlib,json,lzma,zipfile
R=Path(__file__).resolve().parents[1]
BASE='58b311b73a7890fe55a073515e5a2cbf2009a6b8'
def decode(names,expected,limit):
 b=base64.b64decode(''.join((R/n).read_text().strip() for n in names),validate=True)
 assert hashlib.sha256(b).hexdigest()==expected,'Transfer checksum mismatch'
 z=lzma.LZMADecompressor(memlimit=128*1024*1024);raw=z.decompress(b,max_length=limit)
 assert z.eof and not z.unused_data,'Payload bound exceeded'
 return json.loads(raw)
d=decode(['.github/integration/r10-text-1.b64','.github/integration/r10-text-2.b64'],'319db5ca1de8e1534d67c5f71f9ac2ab34a0067702b320c6a7221bb1c66722b2',1024*1024)
assert d['base']==BASE
w=decode(['.github/integration/r10-workbook.b64'],'20aa26612f4dd38d1c5b7b5cfd166b396ec83fb59e294ed64e466d2dbb6c5acd',2*1024*1024)
seen=set();changes=[]
for e in d['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.parts[0] not in ('.git','.github') and str(p) not in seen
 seen.add(str(p));q=R/p;assert not q.is_symlink()
 if e['before'] is None:assert not q.exists(),str(p);text=e['new']
 else:
  old=q.read_bytes();assert hashlib.sha256(old).hexdigest()==e['before'],'Base changed: '+str(p)
  lines=old.decode('utf8').splitlines(keepends=True);last=0
  for start,end,replacement in e['edits']:assert last<=start<=end<=len(lines);last=end
  for start,end,replacement in reversed(e['edits']):lines[start:end]=replacement
  text=''.join(lines)
 body=text.encode('utf8');assert hashlib.sha256(body).hexdigest()==e['after'],'Output changed: '+str(p)
 changes.append((q,body))
protected=sorted(p.relative_to(R).as_posix() for p in (R/'assets').rglob('*') if p.is_file())
protected+=['data/roster.json','data/catalog-expansion-v070.json','data/finishers-v053.json','data/directional-art.json','src/combat-foundation-v060.js','src/catalog-replay-r7.js','src/catalog-replay-contract.js','src/context-contract.js','docs/planning/BOW_PR11_CLOTURES_AUDIT_R9.xlsx','docs/planning/BOW_PR11_MATRICE_EXECUTION_R8.xlsx']
assert len(protected)==518
baseline={'baseCommit':BASE,'files':{n:hashlib.sha256((R/n).read_bytes()).hexdigest() for n in protected}}
for q,body in changes:q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(body)
(R/'docs/DELIVERY_R10_BASELINE.json').write_text(json.dumps(baseline,ensure_ascii=False,indent=2)+'\n')
wb=R/'docs/planning/BOW_PR11_SUIVI_R10.xlsx';seen=set()
with zipfile.ZipFile(wb,'w',zipfile.ZIP_DEFLATED) as z:
 for e in w['entries']:
  p=Path(e['name']);assert not p.is_absolute() and '..' not in p.parts and e['name'] not in seen;seen.add(e['name'])
  i=zipfile.ZipInfo(e['name'],tuple(e['date_time']));i.compress_type=e['compress_type'];i.external_attr=e['external_attr'];i.create_system=e['create_system'];z.writestr(i,e['content'].encode('utf8'))
with zipfile.ZipFile(wb) as z:
 assert z.testzip() is None
 for e in w['entries']:assert z.read(e['name'])==e['content'].encode('utf8')
print(json.dumps({'textFiles':len(changes),'preservedFiles':len(protected),'workbookComponentsUnchanged':len(w['entries']),'workbookSha256':hashlib.sha256(wb.read_bytes()).hexdigest()}))
