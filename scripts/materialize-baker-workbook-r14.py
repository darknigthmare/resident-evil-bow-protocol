#!/usr/bin/env python3
"""Restore artifact_tool-authored workbook bytes at the XML-part level.
No content, formula, style, source or workflow status is manufactured here.
"""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import hashlib,json,lzma,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
blob=b''.join((R/f'.github/reviewed-r14/workbook-{i}.xz').read_bytes() for i in [1,2])
assert len(blob)==9404 and hashlib.sha256(blob).hexdigest()=='18492a6b4168c2947a5e5dcfe95257b28aeabc575b01598b5cfb9dcb8d92b7ef'
parts=json.loads(lzma.decompress(blob,memlimit=128*1024*1024));assert len(parts)==23
out=R/'docs/planning/BOW_STAGES_BAKER_R14.xlsx'
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=9) as z:
 for name,text in sorted(parts.items()):
  p=Path(name);assert not p.is_absolute() and '..' not in p.parts and len(text)<4000000
  i=ZipInfo(name,(2026,10,20,0,0,0));i.compress_type=ZIP_DEFLATED;i.external_attr=0o600<<16
  z.writestr(i,text.encode(),compress_type=ZIP_DEFLATED,compresslevel=9)
with ZipFile(out) as z:
 assert z.testzip() is None and all(z.read(n).decode()==v for n,v in parts.items())
 ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 book=ET.fromstring(z.read('xl/workbook.xml'));assert len(book.find('s:sheets',ns))==6
 formulas=[]
 for name in z.namelist():
  if name.startswith('xl/worksheets/') and name.endswith('.xml'):
   root=ET.fromstring(z.read(name));assert not root.findall('.//s:c[@t="e"]',ns)
   formulas.extend(root.findall('.//s:f',ns))
 assert len(formulas)==5
p=R/'stages.html';s=p.read_text();old='href="docs/BAKER_R14_SCOPE.md"';new='href="docs/planning/BOW_STAGES_BAKER_R14.xlsx" download'
if new not in s:
 assert s.count(old)==1;s=s.replace(old,new);p.write_text(s)
p=R/'tests/browser-baker-r14.mjs';s=p.read_text();marker="   await p.fill('#stageSeek','120');"
extra="   const book=await p.request.get(base+'/docs/planning/BOW_STAGES_BAKER_R14.xlsx');assert.equal(book.status(),200);assert.deepEqual(await book.body(),fs.readFileSync(path.join(R,'docs/planning/BOW_STAGES_BAKER_R14.xlsx')));\n"
if extra not in s:
 assert s.count(marker)==1;s=s.replace(marker,extra+marker);p.write_text(s)
print('R14 workbook: six sheets, five cached formulas, 23 unchanged XML parts;',out.stat().st_size,'bytes. HTTP workbook byte comparison enabled.')
