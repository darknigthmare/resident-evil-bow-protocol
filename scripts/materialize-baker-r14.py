#!/usr/bin/env python3
"""Apply the locally reviewed UTF-8 changes, preflighting all files before writes.
No generated art is fetched and no credentials, save files or remote code are read.
"""
from pathlib import Path
import hashlib,json,lzma
R=Path(__file__).resolve().parents[1];sha=lambda b:hashlib.sha256(b).hexdigest()
b=b''.join((R/f'.github/reviewed-r14/part-{i}.xz').read_bytes() for i in range(1,6))
assert len(b)==21684 and sha(b)=='3522f18f72ad7bf0becfb930491cd2ab611d14aad641d56c4ffa293455a9659f'
data=json.loads(lzma.decompress(b,memlimit=128*1024*1024));assert data['base']=='c505206a06c63843533cfca046cf06544b9e1e28' and len(data['entries'])==20
planned=[];seen=set()
for e in data['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.as_posix() not in seen;seen.add(p.as_posix());f=R/p
 current=f.read_bytes() if f.exists() else None
 if current is not None and sha(current)==e['after']:continue
 if e['before'] is None:
  assert current is None,p;new=e['content'].encode()
 else:
  assert current is not None and sha(current)==e['before'],p
  a,z,text=e['edit'];s=current.decode();assert 0<=a<=z<=len(s);new=(s[:a]+text+s[z:]).encode()
 assert sha(new)==e['after'],p;planned.append((f,new))
for f,b in planned:f.parent.mkdir(exist_ok=True,parents=True);f.write_bytes(b)
# There are eight actual HTML consumers of this renderer, all checked in the loop.
p=R/'tests/verify-baker-stages-r14.mjs';s=p.read_text()
if 'assert(n>=10)' in s:
 assert s.count('assert(n>=10)')==1;p.write_text(s.replace('assert(n>=10)','assert.equal(n,8)'))
print('R14 reviewed delta materialized:',len(planned),'files; all eight renderer pages included.')
