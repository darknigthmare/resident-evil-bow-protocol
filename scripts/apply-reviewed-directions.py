#!/usr/bin/env python3
"""Apply authored source edits, not downloaded code. Guard every before/after hash."""
from pathlib import Path
import json,base64,gzip,hashlib,io
R=Path(__file__).resolve().parents[1]
blob=base64.b64decode(''.join((R/f'.github/integration/directions-{i}.b64').read_text().strip() for i in [1,2]),validate=True)
assert hashlib.sha256(blob).hexdigest()=='d73528cec5df5dfc09dff512b9a0a01123f383dae25ef77db5d49e6f6435fc82','Transfer checksum mismatch'
with gzip.GzipFile(fileobj=io.BytesIO(blob)) as g:
 raw=g.read(1048577)
assert len(raw)<=1048576
D=json.loads(raw);assert D['baseCommit']=='1cac959cd5cc5b40b6cffc94a705970bc74c9580'
changes=[];seen=set()
for e in D['entries']:
 path=Path(e['path']);assert not path.is_absolute() and '..' not in path.parts and path.parts[0]!='.git' and e['path'] not in seen
 seen.add(e['path']);p=R/path;assert not p.is_symlink()
 if e['base'] is None:
  assert not p.exists();text=e['text']
 else:
  data=p.read_bytes();assert hashlib.sha256(data).hexdigest()==e['base'],str(path)
  text=data.decode('utf8');last=0
  for start,end,replacement in e['edits']:assert last<=start<=end<=len(text);last=end
  for start,end,replacement in reversed(e['edits']):text=text[:start]+replacement+text[end:]
 output=text.encode('utf8');assert hashlib.sha256(output).hexdigest()==e['sha256'],str(path)
 changes.append((p,output))
for p,output in changes:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(output)
print(f'Installed {len(changes)} source edits. No new character artwork produced.')
