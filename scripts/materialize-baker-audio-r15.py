#!/usr/bin/env python3
"""Apply a reviewed, hash-pinned UTF-8 delta and an authored Excel transport.
All preconditions and reconstructed bytes are verified before any source write.
The workbook XML is not authored or modified by this transport script.
"""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
from io import BytesIO
import hashlib,json,lzma,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1];sha=lambda x:hashlib.sha256(x).hexdigest()
compressed=b''.join((R/f'.github/reviewed-r15/part-{i}.xz').read_bytes() for i in range(1,6))
assert len(compressed)==28412 and sha(compressed)=='f885d4aaaec8e819d3106dec358120d0ece024c10d180f0967e75043c1924707'
d=json.loads(lzma.decompress(compressed,memlimit=128*1024*1024))
assert d['schema']=='bow.r15.reviewed-source/1' and d['baseCommit']=='4810b5e74f97e41f0fdddcec565246fa72003b01' and len(d['entries'])==20
writes={}
for item in d['entries']:
 p=Path(item['path']);assert not p.is_absolute() and '..' not in p.parts and p.as_posix() not in writes
 target=R/p
 if item['before'] is None:assert not target.exists(),str(p)
 else:assert target.is_file() and sha(target.read_bytes())==item['before'],str(p)
 if 'xlsxParts' in item:
  parts=item['xlsxParts'];assert len(parts)==20
  buf=BytesIO()
  with ZipFile(buf,'w',ZIP_DEFLATED,compresslevel=9) as z:
   for name,text in sorted(parts.items()):
    n=Path(name);assert not n.is_absolute() and '..' not in n.parts
    b=text.encode();assert sha(b)==item['xmlSha256'][name]
    i=ZipInfo(name,(2026,10,20,0,0,0));i.compress_type=ZIP_DEFLATED;i.external_attr=0o600<<16
    z.writestr(i,b,compress_type=ZIP_DEFLATED,compresslevel=9)
  value=buf.getvalue();ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
  with ZipFile(BytesIO(value)) as z:
   assert z.testzip() is None and all(z.read(n)==t.encode() for n,t in parts.items())
   book=ET.fromstring(z.read('xl/workbook.xml'));assert len(book.find('s:sheets',ns))==5
   formulas=[]
   for name in z.namelist():
    if name.startswith('xl/worksheets/') and name.endswith('.xml'):
     s=ET.fromstring(z.read(name));assert not s.findall('.//s:c[@t="e"]',ns);formulas.extend(s.findall('.//s:f',ns))
   assert len(formulas)==4
   sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));cached={c.get('r'):c.find('s:v',ns).text for c in sheet.findall('.//s:c',ns) if c.find('s:f',ns)is not None}
   assert cached=={'A7':'3','D7':'9','G7':'0','G23':'21'}
 elif 'text' in item:value=item['text'].encode()
 else:
  text=target.read_text();edits=item['edits'];previous=0
  for a,b,replacement in edits:assert 0<=previous<=a<=b<=len(text);previous=b
  for a,b,replacement in reversed(edits):text=text[:a]+replacement+text[b:]
  value=text.encode()
 if 'after' in item:assert sha(value)==item['after'],str(p)
 writes[p.as_posix()]=value
for name,value in writes.items():
 p=R/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value)
(R/'R15_REVIEWED_PATHS.json').write_text(json.dumps(list(writes),indent=2)+'\n')
print('R15 reviewed source applied:',len(writes),'files; workbook 20 XML parts preserved, four formulas verified.')
