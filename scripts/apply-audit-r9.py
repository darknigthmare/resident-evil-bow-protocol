#!/usr/bin/env python3
"""Apply bounded, reviewed local text changes after exact predecessor checks."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
d=json.loads((R/'scripts/reviewed-audit-r9.json').read_text())
assert d['base']=='ba4e3cc82f2c9af7c7324420a0cc4409c599fd1a'
changes=[];seen=set()
for e in d['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.parts[0] not in ('.git','.github') and str(p) not in seen
 seen.add(str(p));f=R/p;assert not f.is_symlink();old=f.read_bytes()
 assert hashlib.sha256(old).hexdigest()==e['before'],str(p)
 s=old.decode('utf8');last=0
 for a,b,v in e['edits']:assert last<=a<=b<=len(s);last=b
 for a,b,v in reversed(e['edits']):s=s[:a]+v+s[b:]
 new=s.encode('utf8');assert hashlib.sha256(new).hexdigest()==e['after'],str(p)
 changes.append((f,new))
for f,new in changes:f.write_bytes(new)
(R/'docs/AUDIT_R9_CHANGES.json').write_text(json.dumps({'baseCommit':d['base'],'changed':{e['path']:{'before':e['before'],'after':e['after']} for e in d['entries']}},indent=2)+'\n')
print('Reviewed text edits applied:',len(changes))
