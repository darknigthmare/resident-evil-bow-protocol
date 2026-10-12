#!/usr/bin/env python3
"""Install the exact reviewed local text patch, with before/after SHA checks."""
from pathlib import Path
import json,lzma,hashlib,base64
R=Path(__file__).resolve().parents[1]
blob=base64.b64decode(''.join((R/f'.github/integration/journal071.{i}.b64').read_text().strip() for i in range(1,4)),validate=True)
assert hashlib.sha256(blob).hexdigest()=='86c5b191f145df5225fc6c441663942f9ee7291d2f3f310b5417a5e23d216f59','Transfer checksum mismatch'
z=lzma.LZMADecompressor(memlimit=128*1024*1024);raw=z.decompress(blob,max_length=1024*1024)
assert z.eof and not z.unused_data,'Unexpected payload size'
d=json.loads(raw);assert d['base']=='d6c28a1ac530201036cce05940ad3edf5a6d7714'
assert json.loads((R/'package.json').read_text())['version']=='0.7.0'
changes=[];seen=set()
for e in d['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.parts[0]!='.git' and str(p) not in seen
 seen.add(str(p));q=R/p;assert not q.is_symlink()
 if e['before'] is None:assert not q.exists(),f'Unexpected existing file {p}'
 else:assert hashlib.sha256(q.read_bytes()).hexdigest()==e['before'],f'Changed base {p}'
 content=e['content'].encode('utf8');assert hashlib.sha256(content).hexdigest()==e['after']
 changes.append((q,content))
for q,content in changes:q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(content)
print(f'Applied {len(changes)} verified text files; no remote code or images downloaded.')
