#!/usr/bin/env python3
"""Restore the reviewed artifact_tool workbook without editing any XML component."""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import hashlib,json,lzma
R=Path(__file__).resolve().parents[1];b=(R/'docs/planning/flight-r12-workbook.xz').read_bytes()
assert hashlib.sha256(b).hexdigest()=='abc84a70b214d64bc7218953a29d2184ebe2376631c351374e47307a2df8c3ec'
parts=json.loads(lzma.decompress(b,memlimit=128*1024*1024));assert len(parts)==17
out=R/'docs/planning/BOW_FLIGHT_R12.xlsx'
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=9) as z:
 for name,text in sorted(parts.items()):
  p=Path(name);assert not p.is_absolute() and '..' not in p.parts and len(text)<4000000
  i=ZipInfo(name,(2026,10,19,0,0,0));i.compress_type=ZIP_DEFLATED;i.external_attr=0o600<<16
  z.writestr(i,text.encode(),compress_type=ZIP_DEFLATED,compresslevel=9)
with ZipFile(out) as z:assert z.testzip() is None and all(z.read(n).decode()==v for n,v in parts.items())
print('Four worksheets, 17 artifact_tool-authored XML parts preserved:',out.stat().st_size)
