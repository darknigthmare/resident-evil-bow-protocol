#!/usr/bin/env python3
"""Apply locally reviewed and tested source edits, guarded by SHA-256.
No network retrieval, binary assets or arbitrary archive extraction.
"""
from pathlib import Path
import base64,hashlib,json,lzma
R=Path(__file__).resolve().parents[1]
parts=[R/f'.github/integration/spatial072.{i}.b64' for i in (1,2)]
blob=base64.b64decode(''.join(p.read_text().strip() for p in parts),validate=True)
assert hashlib.sha256(blob).hexdigest()=='d18635680906ab42bdac0727d194c0b13db3e7481eafe1e6b08b008842cfb2e1','Transfer checksum mismatch'
z=lzma.LZMADecompressor(memlimit=128*1024*1024);raw=z.decompress(blob,max_length=1024*1024)
assert z.eof and not z.unused_data,'Oversized or trailing data'
d=json.loads(raw);assert d['base']=='5f0240f5116f0e922ed9be8d41cde22c57335161'
assert json.loads((R/'package.json').read_text())['version']=='0.7.1'
changes=[];seen=set()
for e in d['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.parts[0] not in ('.git','.github') and str(p) not in seen
 seen.add(str(p));q=R/p;assert not q.is_symlink()
 if 'new' in e:
  assert not q.exists(),f'Refusing to overwrite {p}'
  text=e['new']
 else:
  old=q.read_bytes();assert hashlib.sha256(old).hexdigest()==e['base'],f'Changed base: {p}'
  text=old.decode('utf8');last=0
  for start,end,replacement in e['edits']:assert last<=start<=end<=len(text);last=end
  for start,end,replacement in reversed(e['edits']):text=text[:start]+replacement+text[end:]
 content=text.encode('utf8');assert hashlib.sha256(content).hexdigest()==e['sha256'],f'Output mismatch: {p}'
 changes.append((q,content))
for q,content in changes:q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(content)
print(f'Applied {len(changes)} verified text edits.')
