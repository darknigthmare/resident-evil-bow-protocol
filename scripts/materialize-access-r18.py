#!/usr/bin/env python3
"""Hash-pinned source and unchanged artifact_tool XML. Preflight before writes."""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
from io import BytesIO
import base64,hashlib,json,lzma,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1];sha=lambda b:hashlib.sha256(b).hexdigest()
chunks=[(R/f'.github/reviewed-r18/part-{i}.xz').read_bytes() for i in range(1,7)];transport={}
# Exact known copy/encoding error, not a source modification. Both envelopes
# and the whole original payload are hash-pinned; any other change fails.
if sha(chunks[2])=='d91d84b54e06bc0eaece09adcaec0d056ecb87519e39bb657678e32b15c2c5de':
 text=base64.b64encode(chunks[2]).decode().rstrip('=');assert len(text)==8003 and text.count('Bepxedxedlq')==1
 text=text.replace('Bepxedxedlq','Bepxedlq');text=text[:-40]+'KSRj3iJk2glFCGG7R+Pgi2wGCFbweIO7spBnRqWP'
 chunks[2]=base64.b64decode(text,validate=True);transport['.github/reviewed-r18/part-3.xz']=chunks[2]
assert len(chunks[2])==6000 and sha(chunks[2])=='f1e7f108163c097b1fb40ffa3159e08a925a73088fa7f102fbab9fedddc8c842'
raw=b''.join(chunks);assert len(raw)==35772 and sha(raw)=='a498aa2ac468912278999373951b7346289ae00988f5e5e9dee5edc34ecee459'
data=json.loads(lzma.decompress(raw,memlimit=128*1024*1024));assert data['schema']=='bow.r18.reviewed-source/1' and data['base']=='86aa2637b03f1bc094e52339eb4ebf622aa0ce60' and len(data['entries'])==17
writes={}
for item in data['entries']:
 p=Path(item['path']);assert not p.is_absolute() and '..' not in p.parts and p.as_posix() not in writes
 target=R/p
 if item['before'] is None:assert not target.exists(),str(p)
 else:assert target.is_file() and sha(target.read_bytes())==item['before'],str(p)
 if 'xlsxParts' in item:
  parts=item['xlsxParts'];assert len(parts)==26;buffer=BytesIO()
  with ZipFile(buffer,'w',ZIP_DEFLATED,compresslevel=9) as z:
   for name,text in sorted(parts.items()):
    n=Path(name);assert not n.is_absolute() and '..' not in n.parts;b=text.encode();assert sha(b)==item['xmlHashes'][name]
    info=ZipInfo(name,(2026,10,21,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o600<<16
    z.writestr(info,b,compress_type=ZIP_DEFLATED,compresslevel=9)
  output=buffer.getvalue();ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
  with ZipFile(BytesIO(output)) as z:
   assert z.testzip() is None and all(z.read(n)==v.encode() for n,v in parts.items())
   book=ET.fromstring(z.read('xl/workbook.xml'));assert len(book.find('s:sheets',ns))==7
   formulas=[]
   for name in z.namelist():
    if name.startswith('xl/worksheets/') and name.endswith('.xml'):
     t=ET.fromstring(z.read(name));assert not t.findall('.//s:c[@t="e"]',ns);formulas+=t.findall('.//s:f',ns)
   assert len(formulas)==4
   t=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));values={c.get('r'):c.find('s:v',ns).text for c in t.findall('.//s:c',ns) if c.find('s:f',ns)is not None}
   assert values=={'A7':'5','D7':'25','G7':'43','G26':'0'},values
 elif 'text' in item:output=item['text'].encode()
 else:
  text=target.read_text();last=0
  for a,b,v in item['edits']:assert 0<=last<=a<=b<=len(text);last=b
  for a,b,v in reversed(item['edits']):text=text[:a]+v+text[b:]
  output=text.encode()
 if 'after' in item:assert sha(output)==item['after'],str(p)
 writes[p.as_posix()]=output
writes.update(transport)
for name,value in writes.items():
 p=R/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value)
(R/'R18_REVIEWED_PATHS.json').write_text(json.dumps(list(writes),indent=2)+'\n')
print('R18: 17 reviewed paths; seven sheets, four checked cached formulas, 26 unchanged XML parts.')
