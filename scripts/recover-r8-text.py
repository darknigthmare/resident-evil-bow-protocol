#!/usr/bin/env python3
"""Recover interrupted assistant-authored edits without executing project code."""
from pathlib import Path
import base64, hashlib, json, lzma, zipfile
R=Path(__file__).resolve().parents[1]
b=base64.b64decode(''.join((R/f'.github/integration/source-r8-{i}.b64').read_text().strip() for i in range(1,5)),validate=True)
assert hashlib.sha256(b).hexdigest()=='7678a83fb835102fa295c7b1429140799cce17b929e88730b2aab23f002b908f'
z=lzma.LZMADecompressor(memlimit=128*1024*1024);raw=z.decompress(b,max_length=2*1024*1024)
assert z.eof and not z.unused_data
payload=json.loads(raw);assert payload['schema']=='bow.reviewed.text-edits/1' and payload['base']=='d79f9e3ce6d37f91ceb772f0bb457acf34efbf4d'
seen=set();changes=[]
for e in payload['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.parts[0] not in ('.git','.github') and str(p) not in seen
 seen.add(str(p));dest=R/p;assert not dest.is_symlink()
 if e['before'] is None:assert not dest.exists();text=e['new']
 else:
  old=dest.read_bytes();assert hashlib.sha256(old).hexdigest()==e['before'],str(p)
  text=old.decode('utf8');last=0
  for start,end,replacement in e['edits']:assert last<=start<=end<=len(text);last=end
  for start,end,replacement in reversed(e['edits']):text=text[:start]+replacement+text[end:]
 out=text.encode('utf8');assert hashlib.sha256(out).hexdigest()==e['after'],str(p)
 changes.append((str(p),out))
with zipfile.ZipFile(R/'R8_RECOVERED_TEXT.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for name,body in changes:archive.writestr('changes/'+name,body)
 archive.writestr('reviewed-edits.json',raw)
print(json.dumps({'files':len(changes),'paths':[n for n,_ in changes]},indent=2))
