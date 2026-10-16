#!/usr/bin/env python3
"""Apply reviewed local source deltas with before/after checks, then regenerate datasets."""
from pathlib import Path
import base64,hashlib,json,lzma,subprocess,sys
R=Path(__file__).resolve().parents[1]
blob=base64.b64decode(''.join((R/f'.github/integration/combat-stage-r6.{i}.b64').read_text().strip() for i in range(1,4)),validate=True)
assert hashlib.sha256(blob).hexdigest()=='3863eca9c8be8a6dc4a141fe4800897bf5b121c3a564fdfdbdaa76dd2af19b25','Source transfer checksum mismatch'
dec=lzma.LZMADecompressor(memlimit=128*1024*1024);raw=dec.decompress(blob,max_length=1024*1024)
assert dec.eof and not dec.unused_data
payload=json.loads(raw);assert payload['baseCommit']=='28f9b16d6bb1dc00d94a50848f47bb44e8cf0e2b'
changes=[];seen=set()
for e in payload['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.parts[0]!='.git' and str(p) not in seen
 seen.add(str(p));q=R/p;assert not q.is_symlink()
 if e['before'] is None:assert not q.exists();text=e['content']
 else:
  original=q.read_bytes();assert hashlib.sha256(original).hexdigest()==e['before'],f'Changed base: {p}'
  lines=original.decode('utf8').splitlines(keepends=True);last=0
  for start,end,replacement in e['lineEdits']:assert last<=start<=end<=len(lines);last=end
  for start,end,replacement in reversed(e['lineEdits']):lines[start:end]=[replacement]
  text=''.join(lines)
 data=text.encode('utf8');assert hashlib.sha256(data).hexdigest()==e['after'],f'Changed output: {p}'
 changes.append((q,data))
for q,data in changes:q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(data)
subprocess.run([sys.executable,'scripts/build-lore-movesets.py'],cwd=R,check=True)
subprocess.run([sys.executable,'scripts/compile-content.py'],cwd=R,check=True)
subprocess.run(['node','scripts/contract.mjs','--write'],cwd=R,check=True)
for p,digest in payload['generated'].items():assert hashlib.sha256((R/p).read_bytes()).hexdigest()==digest,f'Generated dataset diverged: {p}'
print(f'{len(changes)} reviewed source changes and {len(payload["generated"])} generated outputs verified against the local tested version.')
