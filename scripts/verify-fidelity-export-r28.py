#!/usr/bin/env python3
"""Reproduce the actual delivered R28 workbook and verify its preserved history."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    checks = []
    try:
        for seed in ('17', '73'):
            result = subprocess.run([sys.executable, 'scripts/build-fidelity-tracking-r28.py', '--check'],
                cwd=ROOT, env={**os.environ, 'PYTHONHASHSEED': seed}, capture_output=True, text=True)
            if result.returncode:
                raise ValueError('Tracking changed in an independent Python process: ' + result.stderr)
        checks.append({'name': 'Tracking is identical across two independent hash seeds', 'pass': True, 'hashSeeds': [17, 73]})
        baseline, workbook = (ROOT / 'docs' / name for name in ('BOW_FIDELITE_R27.xlsx', 'BOW_FIDELITE_R28.xlsx'))
        historical_sha = sha(baseline)
        with ZipFile(baseline) as original, ZipFile(workbook) as delivered:
            parts = [name for name in original.namelist() if name.startswith('xl/worksheets/')]
            if any(original.read(name) != delivered.read(name) for name in parts):
                raise ValueError('Historical worksheet XML or relationships changed')
        checks.append({'name': 'All historical worksheet and relationship parts remain byte-exact', 'pass': True, 'parts': len(parts)})
        spec = importlib.util.spec_from_file_location('r28_real_export', ROOT / 'scripts/export-fidelity-progress-r28.py')
        export = importlib.util.module_from_spec(spec); spec.loader.exec_module(export)
        folder = ROOT / 'qa-r28-reproduction'; folder.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=folder) as name:
            temporary = Path(name)
            result = export.export(ROOT / 'docs/R28_TRACKING.json', baseline, temporary / 'reproduced.xlsx', temporary / 'progress.json')
            if sha(temporary / 'reproduced.xlsx') != sha(workbook):
                raise ValueError('Actual workbook is not reproducible from its inputs')
            checks.append({'name': 'A fresh actual export exactly reproduces the delivered workbook', 'pass': True, 'sha256': result['sha256'], 'worksheets': result['total_worksheets']})
            if (temporary / 'progress.json').read_bytes() != (ROOT / 'modules/fidelity-r28/progress.json').read_bytes():
                raise ValueError('Actual progress JSON differs from its export')
            if sha(baseline) != historical_sha:
                raise ValueError('Historical workbook was modified')
            checks.append({'name': 'Actual progress JSON is reproduced and baseline bytes remain unchanged', 'pass': True, 'baselineSha256': historical_sha})
    except Exception as error:
        checks.append({'name': 'Actual export reproduction', 'pass': False, 'error': str(error)})
    files = ['scripts/verify-fidelity-export-r28.py', 'scripts/export-fidelity-progress-r28.py',
             'scripts/build-fidelity-tracking-r28.py', 'docs/R28_TRACKING.json',
             'docs/BOW_FIDELITE_R27.xlsx', 'docs/BOW_FIDELITE_R28.xlsx', 'modules/fidelity-r28/progress.json']
    report = {'schema': 're.bow.fidelity-reproduction-r28/1', 'passed': sum(item['pass'] for item in checks),
              'failed': sum(not item['pass'] for item in checks), 'checks': checks,
              'sourceFiles': [{'path': path, 'sha256': sha(ROOT / path)} for path in files],
              'scope': 'Actual delivered workbook and progress, not synthetic fixtures; no historical input is rewritten.'}
    (ROOT / 'docs/R28_REPRODUCTION.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': report['passed'], 'failed': report['failed']}))
    return 1 if report['failed'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
