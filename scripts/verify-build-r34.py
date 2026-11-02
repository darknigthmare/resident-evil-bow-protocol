#!/usr/bin/env python3
"""Compare the actual static delivery, not an anticipated deployment."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def run():
    records = []
    for path in sorted((ROOT / 'modules/fidelity-r34').rglob('*')):
        if not path.is_file():
            continue
        name = path.relative_to(ROOT).as_posix()
        raw = path.read_bytes()
        assert (ROOT / 'dist' / name).read_bytes() == raw, 'A built R34 file differs: ' + name
        records.append({'path': name, 'bytes': len(raw), 'sha256': sha(raw)})
    assert records
    sources = ['scripts/verify-build-r34.py', 'scripts/build.mjs', 'modules/versus.html', 'catalog-duel.html',
               'docs/BOW_FIDELITE_R34.xlsx', 'docs/FIDELITE_R34.md', 'docs/R34_VALIDATION.json']
    for name in sources[2:]:
        assert (ROOT / name).read_bytes() == (ROOT / 'dist' / name).read_bytes(), 'A built entry or tracking file differs: ' + name
    report = {'schema': 're.bow.build-r34/1', 'passed': 3, 'failed': 0,
              'checks': [{'name': 'All current R34 module bytes match the static build', 'pass': True},
                         {'name': 'The two changed player entries match the static build', 'pass': True},
                         {'name': 'The workbook, validation and tracking documents match the static build', 'pass': True}],
              'moduleFiles': records, 'moduleFileCount': len(records), 'moduleBytes': sum(item['bytes'] for item in records),
              'sourceFiles': [{'path': name, 'sha256': sha((ROOT / name).read_bytes())} for name in sources],
              'scope': 'Actually executed local static-build byte comparison. Remote CI and deployment remain separate.'}
    (ROOT / 'docs/R34_BUILD.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': 3, 'failed': 0, 'files': len(records), 'bytes': report['moduleBytes']}))


if __name__ == '__main__':
    run()
