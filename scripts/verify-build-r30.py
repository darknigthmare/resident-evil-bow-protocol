#!/usr/bin/env python3
"""Compare the actual static build with the complete current R30 delivery."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    files = [path.relative_to(ROOT).as_posix() for path in sorted((ROOT / 'modules/fidelity-r30').rglob('*')) if path.is_file()]
    companions = ['modules/versus.html', 'catalog-duel.html', 'codex.html', 'docs/BOW_FIDELITE_R30.xlsx']
    checks, inputs = [], []
    for names, label in ((files, 'Every current R30 module file is copied byte-exact into dist'),
                         (companions, 'Current combat mounts, Codex and workbook match the static build')):
        failures = []
        for name in names:
            raw = (ROOT / name).read_bytes()
            target = ROOT / 'dist' / name
            if not target.is_file() or target.read_bytes() != raw:
                failures.append(name)
            inputs.append({'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
        checks.append({'name': label, 'pass': not failures, 'files': len(names), 'mismatches': failures})
    roster = json.loads((ROOT / 'data/roster.json').read_text())
    counts = {'fighters': len(roster['fighters']), 'catalogue': len(roster['catalog']), 'arenas': len(roster['stages'])}
    checks.append({'name': 'The published game retains115 fighters,389 catalogue references and52 arenas',
                   'pass': counts == {'fighters': 115, 'catalogue': 389, 'arenas': 52}, 'counts': counts})
    inputs.append({'path': 'scripts/verify-build-r30.py', 'sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
    result = {'schema': 're.bow.build-check-r30/1', 'passed': sum(item['pass'] for item in checks),
              'failed': sum(not item['pass'] for item in checks), 'checks': checks,
              'module_files': len(files), 'module_bytes': sum((ROOT / name).stat().st_size for name in files),
              'sourceFiles': inputs, 'scope': 'Executed npm run build followed by a byte comparison of the current module, mounts and workbook; no remote deployment claim.'}
    (ROOT / 'docs/R30_BUILD.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ('passed', 'failed', 'module_files', 'module_bytes')}))
    return int(bool(result['failed']))


if __name__ == '__main__':
    raise SystemExit(main())
