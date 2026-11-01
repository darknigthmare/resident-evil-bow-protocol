#!/usr/bin/env python3
"""Compare the actual static build with the delivered R33 module, entry points and workbook."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    checks = []
    files = sorted(path for path in (ROOT / 'modules/fidelity-r33').rglob('*') if path.is_file())
    evidence = []
    for path in files:
        name = path.relative_to(ROOT).as_posix()
        source = path.read_bytes()
        target = ROOT / 'dist' / name
        assert target.is_file() and target.read_bytes() == source, 'Built R33 file differs: ' + name
        evidence.append({'path': name, 'bytes': len(source), 'sha256': digest(source)})
    assert files
    checks.append({'name': 'All delivered R33 module bytes are preserved in dist', 'pass': True,
                   'files': len(files), 'bytes': sum(item['bytes'] for item in evidence),
                   'fileListSha256': digest(json.dumps(evidence, sort_keys=True).encode())})
    mounts = ['modules/versus.html', 'catalog-duel.html', 'codex.html', 'saves.html']
    for name in mounts:
        assert (ROOT / name).read_bytes() == (ROOT / 'dist' / name).read_bytes(), 'Built mount differs: ' + name
    checks.append({'name': 'All four changed entry documents are copied exactly', 'pass': True, 'paths': mounts})
    for name in ['docs/BOW_FIDELITE_R33.xlsx', 'docs/FIDELITE_R33.md', 'docs/R33_VALIDATION.json']:
        assert (ROOT / name).read_bytes() == (ROOT / 'dist' / name).read_bytes(), 'Built R33 proof differs: ' + name
    checks.append({'name': 'The final workbook and its tracking proofs are copied exactly', 'pass': True})
    sources = ['scripts/verify-build-r33.py', 'scripts/build.mjs'] + mounts + ['docs/BOW_FIDELITE_R33.xlsx']
    report = {'schema': 're.bow.build-r33/1', 'passed': len(checks), 'failed': 0, 'checks': checks,
              'sourceFiles': [{'path': name, 'sha256': digest((ROOT / name).read_bytes())} for name in sources],
              'moduleFiles': evidence, 'scope': 'Actual local static build byte comparison. No remote CI or deployment result claimed.'}
    (ROOT / 'docs/R33_BUILD.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': len(checks), 'failed': 0, 'files': len(files), 'bytes': sum(item['bytes'] for item in evidence)}))


if __name__ == '__main__':
    main()
