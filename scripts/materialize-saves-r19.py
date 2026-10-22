#!/usr/bin/env python3
"""Materialize hash-pinned reviewed source. Validate every preimage before writes.
The spreadsheet is an exact artifact_tool export, never edited during transport.
The browser workflow is published separately through the authorized repository
connection: the Actions job never creates or changes a workflow with its token.
"""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
import base64,hashlib,json,lzma
R=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
raw=b''.join((R/f'.github/reviewed-r19/part-{i}.xz').read_bytes() for i in range(1,6))
assert len(raw)==32472 and sha(raw)=='d05fa5208a1f796dbc6269d94a980bb90e249aedf61af44d5820be462936c34c'
data=json.loads(lzma.decompress(raw,memlimit=128*1024*1024))
assert data['base']=='f9dcf65c0b147be5942aba82ffbab738147d0481' and len(data['entries'])==14
writes={}
for item in data['entries']:
 p=Path(item['path']);assert not p.is_absolute() and '..' not in p.parts and p.as_posix() not in writes
 target=R/p
 if p.as_posix()=='.github/workflows/saves-r19-browser.yml':
  assert target.is_file() and sha(target.read_bytes())==item['after'],'Browser workflow must already match its separately published revision'
 elif item['before'] is None:assert not target.exists(),str(p)
 else:assert target.is_file() and sha(target.read_bytes())==item['before'],str(p)
 if 'base64' in item:
  value=base64.b64decode(item['base64'],validate=True)
  with ZipFile(BytesIO(value)) as z:assert z.testzip() is None and 'xl/workbook.xml' in z.namelist()
 elif 'text' in item:value=item['text'].encode('utf-8')
 else:
  text=target.read_text(encoding='utf-8');last=0
  for a,b,replacement in item['edits']:assert 0<=last<=a<=b<=len(text);last=b
  for a,b,replacement in reversed(item['edits']):text=text[:a]+replacement+text[b:]
  value=text.encode('utf-8')
 assert sha(value)==item['after'],str(p)
 writes[p.as_posix()]=value
for name,value in writes.items():
 p=R/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value)
(R/'R19_REVIEWED_PATHS.json').write_text(json.dumps(list(writes),indent=2)+'\n')
print('R19: fourteen reviewed paths checked; exact XLSX retained; browser workflow unchanged from its authorized publication.')
