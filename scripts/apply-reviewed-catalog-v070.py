#!/usr/bin/env python3
"""Apply repository-local reviewed files after verifying all source and output hashes."""
from pathlib import Path
import base64, hashlib, json, lzma
ROOT = Path(__file__).resolve().parents[1]
EXPECTED = 'aca6f55cff7f7dbc8e93a0c3dd04ab93f071dd8e4806892168e99b2709f4b943'
parts = [(ROOT / f'.github/integration/catalog-v070.{i}.b64').read_text().strip() for i in range(1, 6)]
for i, part in enumerate(parts, 1):
    print('part', i, len(part), hashlib.sha256(part.encode()).hexdigest())
blob = base64.b64decode(''.join(parts), validate=True)
assert hashlib.sha256(blob).hexdigest() == EXPECTED, 'Integration checksum mismatch'
dec = lzma.LZMADecompressor(memlimit=128 * 1024 * 1024)
raw = dec.decompress(blob, max_length=1024 * 1024)
assert dec.eof and not dec.unused_data, 'Oversized or trailing payload'
data = json.loads(raw)
assert data['baseCommit'] == 'e6fa6f470e66f2cc020d239dac9302997fe6db24'
for name, expected in data['baseHashes'].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == expected, f'Base changed: {name}'
changes = []
seen = set()
for entry in data['entries']:
    relative = Path(entry['path'])
    assert not relative.is_absolute() and '..' not in relative.parts
    assert relative.parts[0] not in ('.git', '.github') and str(relative) not in seen
    seen.add(str(relative))
    path = ROOT / relative
    assert path.resolve().is_relative_to(ROOT) and not path.exists(), f'Refusing overwrite: {relative}'
    output = entry['content'].encode('utf-8')
    assert hashlib.sha256(output).hexdigest() == entry['sha256'], f'Invalid file: {relative}'
    changes.append((path, output))
for path, output in changes:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(output)
print('Applied', len(changes), 'verified source files; generated datasets require QA before commit.')
