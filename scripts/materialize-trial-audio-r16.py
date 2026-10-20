#!/usr/bin/env python3
"""Apply reviewed hash-pinned source and transport the authored workbook.
Every predecessor and output is checked before any write. No cell is edited.
"""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
from io import BytesIO
import hashlib,json,lzma,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1];sha=lambda b:hashlib.sha256(b).hexdigest()
raw=b''.join((R/f'.github/reviewed-r16/part-{i}.xz').read_bytes() for i in range(1,6))
assert len(raw)==29564 and sha(raw)=='0a048f95fa8ba53b35e71eb7746bd5e18c334cbd6840dd38003d27c6b9f86b65'
data=json.loads(lzma.decompress(raw,memlimit=128*1024*1024))
assert data['schema']=='bow.r16.reviewed-source/1' and data['baseCommit']=='f214d9d4c367a8be861bf556866dc211ea9334b1' and len(data['entries'])==18
writes={}
for item in data['entries']:
 p=Path(item['path']);assert not p.is_absolute() and '..' not in p.parts and p.as_posix() not in writes
 target=R/p
 if item['before'] is None:assert not target.exists(),str(p)
 else:assert target.is_file() and sha(target.read_bytes())==item['before'],str(p)
 if 'xlsxParts' in item:
  parts=item['xlsxParts'];assert len(parts)==20;buffer=BytesIO()
  with ZipFile(buffer,'w',ZIP_DEFLATED,compresslevel=9) as z:
   for name,text in sorted(parts.items()):
    n=Path(name);assert not n.is_absolute() and '..' not in n.parts
    b=text.encode();assert sha(b)==item['xmlSha256'][name]
    i=ZipInfo(name,(2026,10,20,0,0,0));i.compress_type=ZIP_DEFLATED;i.external_attr=0o600<<16
    z.writestr(i,b,compress_type=ZIP_DEFLATED,compresslevel=9)
  output=buffer.getvalue();ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
  with ZipFile(BytesIO(output)) as z:
   assert z.testzip() is None and all(z.read(n)==t.encode() for n,t in parts.items())
   book=ET.fromstring(z.read('xl/workbook.xml'));assert len(book.find('s:sheets',ns))==5
   formulas=[]
   for n in z.namelist():
    if n.startswith('xl/worksheets/') and n.endswith('.xml'):
     sheet=ET.fromstring(z.read(n));assert not sheet.findall('.//s:c[@t="e"]',ns);formulas.extend(sheet.findall('.//s:f',ns))
   assert len(formulas)==4
   sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));cached={c.get('r'):c.find('s:v',ns).text for c in sheet.findall('.//s:c',ns) if c.find('s:f',ns)is not None}
   assert cached=={'A7':'5','D7':'25','G7':'15','G26':'0'},cached
 elif 'text' in item:output=item['text'].encode()
 else:
  text=target.read_text();previous=0
  for a,b,replacement in item['edits']:assert 0<=previous<=a<=b<=len(text);previous=b
  for a,b,replacement in reversed(item['edits']):text=text[:a]+replacement+text[b:]
  output=text.encode()
 if 'after' in item:assert sha(output)==item['after'],str(p)
 writes[p.as_posix()]=output
for name,value in writes.items():
 p=R/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value)
(R/'R16_REVIEWED_PATHS.json').write_text(json.dumps(list(writes),indent=2)+'\n')
print('R16 applied:',len(writes),'reviewed paths; five sheets, four formulas, 20 unchanged XML components.')
