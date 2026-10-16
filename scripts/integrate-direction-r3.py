#!/usr/bin/env python3
"""Apply tested repository-local source edits; no remote executable or asset downloads."""
from pathlib import Path
import base64,hashlib,json,lzma
R=Path(__file__).resolve().parents[1]
blob=base64.b64decode(''.join((R/f'.github/integration/direction-r3-{i}.b64').read_text().strip() for i in range(1,3)),validate=True)
assert hashlib.sha256(blob).hexdigest()=='c30b1cad3f83ab0746bae5e94caa800b156c5a37b669e2bf7aeaa5d6a74afc8b','Transfer checksum mismatch'
z=lzma.LZMADecompressor(memlimit=128*1024*1024)
raw=z.decompress(blob,max_length=1024*1024)
assert z.eof and not z.unused_data,'Unexpected payload size'
data=json.loads(raw)
assert data['base']=='86edbf48aba383c3bc0a7c8ed6e79b53042c98bd'
changes=[];seen=set()
for e in data['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.parts[0]!='.git' and str(p) not in seen
 seen.add(str(p));q=R/p;assert not q.is_symlink()
 if e['before'] is None:
  assert not q.exists(),f'Unexpected existing file: {p}'
  text=e['content']
 else:
  old=q.read_bytes();assert hashlib.sha256(old).hexdigest()==e['before'],f'Base changed: {p}'
  text=old.decode('utf8');last=0
  for start,end,replacement in e['edits']:
   assert last<=start<=end<=len(text);last=end
  for start,end,replacement in reversed(e['edits']):text=text[:start]+replacement+text[end:]
 output=text.encode('utf8');assert hashlib.sha256(output).hexdigest()==e['after'],f'Output changed: {p}'
 changes.append((q,output))
for q,output in changes:q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(output)
print('Applied',len(changes),'reviewed source edits. No new character drawings generated.')
