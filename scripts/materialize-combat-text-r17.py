#!/usr/bin/env python3
"""Restore reviewed source and authored Excel. All hashes checked before writes."""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
from io import BytesIO
import json,lzma,hashlib,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1];sha=lambda b:hashlib.sha256(b).hexdigest()
chunks=[(R/f'.github/reviewed-r17/part-{i}.xz').read_bytes() for i in range(1,5)]
# One observed transport-byte correction, pinned on both sides. Source bytes
# remain the reviewed payload. The corrected chunk is committed with the code.
transport={}
if sha(chunks[1])=='239a0a85f2bbe79c82783ad10333b3fdd075d31e8f6f832381f2f5e17103f203':
 b=bytearray(chunks[1]);assert len(b)==9000 and b[574]==183;b[574]=199;chunks[1]=bytes(b)
 transport['.github/reviewed-r17/part-2.xz']=chunks[1]
assert sha(chunks[1])=='b846eae9c64fd8545c477642244d8ca5fd7d745774880d319411088d037510cf'
raw=b''.join(chunks)
assert len(raw)==31248 and sha(raw)=='0505ee69e45b99811ed9e96e35f29cf35fec8c28df1d12da321408fd11eb261f'
data=json.loads(lzma.decompress(raw,memlimit=128*1024*1024))
assert data['schema']=='bow.r17.reviewed-source/1' and data['base']=='0663f925b2cba8fbe3b42fc2f0dbcf7f2a2e70ef' and len(data['entries'])==22
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
    b=text.encode();assert sha(b)==item['xmlHashes'][name]
    i=ZipInfo(name,(2026,10,21,0,0,0));i.compress_type=ZIP_DEFLATED;i.external_attr=0o600<<16
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
   assert cached=={'A7':'5','D7':'26','G7':'16','G25':'0'},cached
 elif 'text' in item:output=item['text'].encode()
 else:
  text=target.read_text();previous=0
  for a,b,replacement in item['edits']:assert 0<=previous<=a<=b<=len(text);previous=b
  for a,b,replacement in reversed(item['edits']):text=text[:a]+replacement+text[b:]
  output=text.encode()
 if 'after' in item:assert sha(output)==item['after'],str(p)
 writes[p.as_posix()]=output
writes.update(transport)
for name,value in writes.items():
 p=R/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value)
(R/'R17_REVIEWED_PATHS.json').write_text(json.dumps(list(writes),indent=2)+'\n')
print('R17: 22 reviewed source/document paths and transport normalized; five sheets, four cached formulas, 20 unchanged XML parts.')
