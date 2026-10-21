#!/usr/bin/env python3
"""Transport only: restore exact artifact_tool-authored XML; no cell edits."""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import lzma,json,hashlib
R=Path(__file__).resolve().parents[1];compressed=(R/'docs/planning/lucas-r11-workbook.xz').read_bytes()
assert hashlib.sha256(compressed).hexdigest()=='8db0e41cea0c046cdb785b2946f4b929ab40449872b989184faea3e034b7eaa9'
data=json.loads(lzma.decompress(compressed,memlimit=128*1024*1024));assert len(data)<100
out=R/'docs/planning/BOW_LUCAS_DISPOSITIFS_R11.xlsx'
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=9) as z:
 for name,text in sorted(data.items()):
  n=Path(name);assert not n.is_absolute() and '..' not in n.parts and len(text)<4000000
  i=ZipInfo(name,(2026,10,19,0,0,0));i.compress_type=ZIP_DEFLATED;i.external_attr=0o600<<16
  z.writestr(i,text.encode(),compress_type=ZIP_DEFLATED,compresslevel=9)
with ZipFile(out) as z:
 assert z.testzip() is None and all(z.read(n).decode()==v for n,v in data.items())
print('artifact_tool workbook XML preserved:',len(data),'parts;',out.stat().st_size,'bytes')
