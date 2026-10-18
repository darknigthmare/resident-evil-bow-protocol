#!/usr/bin/env python3
"""Apply bounded reviewed text edits; validate all files before any replacement."""
from pathlib import Path
import base64,hashlib,json,lzma
R=Path(__file__).resolve().parents[1]
b=base64.b64decode(''.join((R/f'.github/integration/audit-r9-{i}.b64').read_text().strip() for i in range(1,5)),validate=True)
assert hashlib.sha256(b).hexdigest()=='686d230fcd6ebac832d651bbc795c0b594cfa6cd41eb6b266e100c7cd2a4166d','Transfer checksum mismatch'
z=lzma.LZMADecompressor(memlimit=128*1024*1024);raw=z.decompress(b,max_length=2*1024*1024)
assert z.eof and not z.unused_data
obj=json.loads(raw);assert obj['schema']=='bow.reviewed.line-edits/1' and obj['base']=='ba4e3cc82f2c9af7c7324420a0cc4409c599fd1a'
changes=[];seen=set()
for e in obj['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.parts[0] not in ('.git','.github') and str(p) not in seen
 seen.add(str(p));dest=R/p;assert not dest.is_symlink()
 if e['before'] is None:assert not dest.exists();text=e['new']
 else:
  old=dest.read_bytes();assert hashlib.sha256(old).hexdigest()==e['before'],str(p)
  lines=old.decode('utf8').splitlines(keepends=True);last=0
  for start,end,replacement in e['edits']:assert last<=start<=end<=len(lines);last=end
  for start,end,replacement in reversed(e['edits']):lines[start:end]=replacement
  text=''.join(lines)
 out=text.encode('utf8');assert hashlib.sha256(out).hexdigest()==e['after'],str(p)
 changes.append((dest,out))
for p,out in changes:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(out)
print('Applied reviewed R9 source files:',len(changes))
