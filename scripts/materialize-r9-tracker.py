#!/usr/bin/env python3
"""Repackage unmodified artifact_tool XML exports into a deterministic XLSX."""
from pathlib import Path
import base64,hashlib,json,lzma,zipfile,io
from xml.etree import ElementTree as ET
R=Path(__file__).resolve().parents[1]
b=base64.b64decode((R/'docs/planning/r9-workbook-xml.xz.b64').read_text().strip(),validate=True)
assert hashlib.sha256(b).hexdigest()=='4cf28f5db8a9e84b40c397c1f951044cf4f7887d71dba4f1b675d3141f4b92b8','Workbook transport checksum mismatch'
d=lzma.LZMADecompressor(memlimit=128*1024*1024);raw=d.decompress(b,max_length=8*1024*1024)
assert d.eof and not d.unused_data,'Workbook transport exceeded bounds'
parts=json.loads(raw);assert len(parts)==20
for name,text in parts.items():
 p=Path(name);assert not p.is_absolute() and '..' not in p.parts and isinstance(text,str)
 ET.fromstring(text)
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
book=ET.fromstring(parts['xl/workbook.xml']);assert len(book.findall('s:sheets/s:sheet',ns))==5
sheet=ET.fromstring(parts['xl/worksheets/sheet1.xml'])
caches={c.get('r'):c.find('s:v',ns).text for c in sheet.findall('.//s:c',ns) if c.find('s:f',ns) is not None}
assert caches=={'A6':'6','D6':'26','G6':'10','D25':'8'}
out=io.BytesIO()
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for name,text in parts.items():
  info=zipfile.ZipInfo(name,(2026,10,19,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o600<<16
  archive.writestr(info,text.encode('utf-8'),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
body=out.getvalue();dest=R/'docs/planning/BOW_PR11_CLOTURES_AUDIT_R9.xlsx'
if dest.exists():assert dest.read_bytes()==body,'Refusing to replace a divergent workbook'
else:dest.write_bytes(body)
with zipfile.ZipFile(dest) as archive:assert archive.testzip() is None
print(json.dumps({'sheets':5,'xmlParts':20,'formulaCaches':caches,'sha256':hashlib.sha256(body).hexdigest()}))
