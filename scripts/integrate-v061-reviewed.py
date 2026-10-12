#!/usr/bin/env python3
"""Apply exact reviewed source edits, guarded by before/after SHA-256.
The payload is repository-local; no network reads or arbitrary path extraction.
"""
from pathlib import Path
import base64,hashlib,json,lzma
R=Path(__file__).resolve().parents[1]
EXPECTED='5e948bc65102705ddcbcba67e46da1b28219154e7f45a50b0ac2c20ba172a139'
parts=[R/f'.github/integration/continuity-v061.{i}.b64' for i in range(1,5)]
blob=base64.b64decode(''.join(p.read_text().strip() for p in parts),validate=True)
assert hashlib.sha256(blob).hexdigest()==EXPECTED,'Integration checksum mismatch'
dec=lzma.LZMADecompressor(memlimit=128*1024*1024);raw=dec.decompress(blob,max_length=1024*1024)
assert dec.eof and not dec.unused_data,'Oversized or trailing integration payload'
data=json.loads(raw);assert data['baseCommit']=='5d1f80f7d8e3bd06c5a9c0c31985e0b319e1377a'
assert json.loads((R/'package.json').read_text())['version']=='0.6.0','Unexpected source version'
changes=[];seen=set()
for e in data['entries']:
 path=Path(e['path']);assert not path.is_absolute() and '..' not in path.parts and path.parts[0]!='.git'
 assert e['path'] not in seen;seen.add(e['path']);p=R/path
 if 'new' in e:
  assert not p.exists(),f'Refusing to overwrite {path}'
  text=e['new']
 else:
  original=p.read_bytes();assert hashlib.sha256(original).hexdigest()==e['base'],f'Base changed: {path}'
  text=original.decode('utf8');edits=e['edits'];last=0
  for start,end,replacement in edits:assert last<=start<=end<=len(text);last=end
  for start,end,replacement in reversed(edits):text=text[:start]+replacement+text[end:]
 output=text.encode('utf8');assert hashlib.sha256(output).hexdigest()==e['sha256'],f'Output changed: {path}'
 changes.append((p,output))
for p,output in changes:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(output)
(R/'styles/bow-v061.css').write_text((R/'styles/bow-v060.css').read_text()+'\n'+(R/'styles/continuity-v061.css').read_text())
print(f'Applied {len(changes)} SHA-verified source changes; runtime datasets must now be regenerated.')
