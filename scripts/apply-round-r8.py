#!/usr/bin/env python3
"""Apply a reviewed local-only patch after validating every before/after digest."""
from pathlib import Path
import base64,hashlib,json,lzma
R=Path(__file__).resolve().parents[1]
parts=[R/f'.github/integration/round-r8.{i}.b64' for i in range(1,4)]
blob=base64.b64decode(''.join(p.read_text().strip() for p in parts),validate=True)
assert hashlib.sha256(blob).hexdigest()=='03c829de94a0f3c465a24f3b3dd7476fb2d1a47d9fe126418430f19b27b916bf','Transfer digest mismatch'
z=lzma.LZMADecompressor(memlimit=128*1024*1024)
raw=z.decompress(blob,max_length=1024*1024)
assert z.eof and not z.unused_data,'Unexpected payload size'
d=json.loads(raw)
assert d['base']=='d79f9e3ce6d37f91ceb772f0bb457acf34efbf4d'
assert json.loads((R/'package.json').read_text())['version']=='0.7.3'
changes=[];seen=set()
for e in d['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.parts[0]!='.git' and str(p) not in seen
 seen.add(str(p));q=R/p;assert not q.is_symlink()
 if e['before'] is None:
  assert not q.exists(),f'Unexpected existing file {p}'
 else:
  assert hashlib.sha256(q.read_bytes()).hexdigest()==e['before'],f'Changed base {p}'
 if 'binary' in e:content=base64.b64decode(e['binary'],validate=True)
 elif 'text' in e:content=e['text'].encode('utf8')
 else:
  text=q.read_text(encoding='utf8');last=0
  for start,end,replacement in e['edits']:
   assert last<=start<=end<=len(text);last=end
  for start,end,replacement in reversed(e['edits']):text=text[:start]+replacement+text[end:]
  content=text.encode('utf8')
 assert hashlib.sha256(content).hexdigest()==e['after'],f'Output digest mismatch: {p}'
 changes.append((q,content))
for q,content in changes:q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(content)
print(f'Applied {len(changes)} validated source/planning files. No network reads.')
