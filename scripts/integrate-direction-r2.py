from pathlib import Path
import base64,hashlib,json,lzma
R=Path(__file__).resolve().parents[1]
b=base64.b64decode(''.join((R/f'.github/integration/direction-r2-{i}.b64').read_text().strip() for i in range(1,4)),validate=True)
assert hashlib.sha256(b).hexdigest()=='110d07ed5113714a862ec28448d6ed66a209890cfdb507de1a817fb99a124aca'
z=lzma.LZMADecompressor(memlimit=128*1024*1024);raw=z.decompress(b,max_length=1024*1024);assert z.eof and not z.unused_data
D=json.loads(raw);assert D['base']=='7d6eb05fd0a094ded579e23fd174e6bb99679e61'
changes=[];seen=set()
for e in D['entries']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts and p.parts[0]!='.git' and str(p) not in seen;seen.add(str(p));q=R/p;assert not q.is_symlink()
 if e['before'] is None:assert not q.exists();s=e['content']
 else:
  old=q.read_bytes();assert hashlib.sha256(old).hexdigest()==e['before'],str(p);s=old.decode();last=0
  for a,b,v in e['edits']:assert last<=a<=b<=len(s);last=b
  for a,b,v in reversed(e['edits']):s=s[:a]+v+s[b:]
 out=s.encode();assert hashlib.sha256(out).hexdigest()==e['after'],str(p);changes.append((q,out))
for q,out in changes:q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(out)
print('Applied',len(changes),'reviewed source edits. No artwork generated.')
