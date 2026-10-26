#!/usr/bin/env python3
"""Record and verify the additive R27 delivery without changing source bytes."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
BASELINE = '826f7ed1811c48adc0609f97699eb32f629fc78a'
EXCEPTIONS = {
    'index.html', 'codex.html', 'modules/versus.html', 'catalog-duel.html',
    'tests/browser-access-r25.mjs', 'tests/browser-access-r26.mjs', 'tests/browser-sprites-r20.mjs',
    '.github/workflows/source-fidelity-r26.yml',
}


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def record(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest(),
            'git_blob_sha1': hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()}


def inspect():
    changed = set(git('diff', '--name-only', BASELINE, '--').decode().splitlines())
    protected = ['src', 'data', 'assets', 'docs/planning', 'modules/source-motion-r22',
                 'modules/fidelity-r23', 'modules/fidelity-r24', 'modules/fidelity-r25', 'modules/fidelity-r26']
    protected_changes = git('diff', '--name-only', BASELINE, '--', *protected).decode().splitlines()
    protected_additions = git('ls-files', '--others', '--exclude-standard', '--', *protected).decode().splitlines()
    if protected_changes or protected_additions:
        raise ValueError('Protected historical trees changed: ' + ', '.join(protected_changes + protected_additions))
    historical = {name for name in changed if git('ls-tree', BASELINE, '--', name).strip()}
    if historical - EXCEPTIONS:
        raise ValueError('Unreviewed historical changes: ' + ', '.join(sorted(historical - EXCEPTIONS)))
    for name in sorted(historical & {'index.html', 'codex.html', 'modules/versus.html', 'catalog-duel.html'}):
        import re
        before = git('show', BASELINE + ':' + name)
        after = (ROOT / name).read_bytes()
        if name == 'codex.html':
            expression = rb'<script src="modules/fidelity-r27/dossier-link\.js"></script>'
        else:
            prefix = b'fidelity-r27/' if name.startswith('modules/') else b'modules/fidelity-r27/'
            expression = rb'<script src="' + prefix + rb'combat/(?:sprite-runtime|adapter|presentation)\.js"></script>'
        additions = re.findall(expression, after)
        if not additions or len(additions) != len(set(additions)) or re.sub(expression, b'', after) != before:
            raise ValueError('Historical HTML may only append the reviewed R27 adapters once: ' + name)
    source = ROOT / 'modules/fidelity-r27'
    records = [record(path) for path in sorted(source.rglob('*')) if path.is_file()]
    if any(item['bytes'] >= 100 * 1024 * 1024 for item in records):
        raise ValueError('A source file exceeds the GitHub individual blob limit')
    baseline = ROOT / 'docs/BOW_FIDELITE_R26.xlsx'
    output = ROOT / 'docs/BOW_FIDELITE_R27.xlsx'
    with ZipFile(baseline) as old, ZipFile(output) as new:
        names = [name for name in old.namelist() if name.startswith('xl/worksheets/')]
        for name in names:
            if old.read(name) != new.read(name):
                raise ValueError('Historical worksheet bytes changed: ' + name)
        old_sheets = sum(name.startswith('xl/worksheets/sheet') and name.endswith('.xml') for name in old.namelist())
        new_sheets = sum(name.startswith('xl/worksheets/sheet') and name.endswith('.xml') for name in new.namelist())
        if (old_sheets, new_sheets) != (29, 35):
            raise ValueError('Expected all 29 historical and six new worksheets')
    return {
        'schema': 're.bow.additive-delivery-r27/1', 'baseline_commit': BASELINE,
        'historical_files_changed': sorted(historical),
        'protected_trees': protected,
        'historical_worksheet_parts_preserved': len(names), 'historical_sheets_preserved': 29,
        'new_sheets': 6, 'module_file_count': len(records),
        'module_bytes': sum(item['bytes'] for item in records), 'files': records,
        'baseline_workbook': record(baseline), 'workbook': record(output),
        'canonical_fidelity_certified': 0,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--staged', action='store_true', help='Also compare every module blob to the Git index')
    args = parser.parse_args()
    result = inspect()
    if args.staged:
        for item in result['files']:
            staged = git('rev-parse', ':' + item['path']).decode().strip()
            if staged != item['git_blob_sha1']:
                raise ValueError('Git index changed source bytes: ' + item['path'])
    path = ROOT / 'docs/R27_SOURCE_ADDITIONS.json'
    payload = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if path.read_bytes() != payload:
            raise ValueError('The delivery ledger differs from the current files')
    else:
        path.write_bytes(payload)
    print(json.dumps({'files': result['module_file_count'], 'bytes': result['module_bytes'],
                      'historical_sheets_preserved': 29, 'new_sheets': 6,
                      'index_bytes_verified': args.staged}))


if __name__ == '__main__':
    main()
