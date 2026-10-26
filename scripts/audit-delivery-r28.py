#!/usr/bin/env python3
"""Verify additive R28 changes, source-byte preservation and workbook history."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
BASELINE = '0317da5f79e40af1b6b0e82b1ef9f311900ee76a'
ALLOWED = {
    'catalog-duel.html', 'modules/versus.html', 'codex.html',
    'tests/engine-vm.cjs', 'tests/browser-combat-sprites-r27.mjs',
    '.github/workflows/source-fidelity-r27.yml',
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
    historical = {name for name in changed if git('ls-tree', BASELINE, '--', name).strip()}
    if historical - ALLOWED:
        raise ValueError('Unreviewed historical changes: ' + ', '.join(sorted(historical - ALLOWED)))
    for name in sorted(historical & {'catalog-duel.html', 'modules/versus.html', 'codex.html'}):
        before, after = git('show', BASELINE + ':' + name), (ROOT / name).read_bytes()
        if name == 'codex.html':
            script = rb'<script src="modules/fidelity-r28/dossier-link\.js"></script>'
            if len(re.findall(script, after)) != 1 or re.sub(script, b'', after) != before:
                raise ValueError('Dossier integration must remain one additive R28 script')
        else:
            prefix = b'' if name.startswith('modules/') else b'modules/'
            style = rb'<link rel="stylesheet" href="' + prefix + rb'fidelity-r28/evolutions/styles\.css">'
            scripts = rb'<script src="' + prefix + rb'fidelity-r28/evolutions/(?:data|selection)\.js"></script>'
            if len(re.findall(style, after)) != 1 or len(re.findall(scripts, after)) != 2:
                raise ValueError('Missing or duplicate R28 selector hooks: ' + name)
            stripped = re.sub(style, b'', re.sub(scripts, b'', after))
            stripped = stripped.replace(prefix + b'fidelity-r28/combat/sprite-runtime.js',
                                        prefix + b'fidelity-r27/combat/sprite-runtime.js')
            if stripped != before:
                raise ValueError('Unreviewed historical HTML changes: ' + name)
    protected = ['src', 'data', 'assets', 'docs/planning'] + [
        'modules/' + p.name for p in sorted((ROOT / 'modules').iterdir())
        if p.is_dir() and p.name != 'fidelity-r28']
    changed_protected = git('diff', '--name-only', BASELINE, '--', *protected).decode().splitlines()
    new_protected = git('ls-files', '--others', '--exclude-standard', '--', *protected).decode().splitlines()
    if changed_protected or new_protected:
        raise ValueError('Changes in protected trees: ' + ', '.join(changed_protected + new_protected))
    files = [record(path) for path in sorted((ROOT / 'modules/fidelity-r28').rglob('*')) if path.is_file()]
    if not files or any(item['bytes'] >= 100 * 1024 * 1024 for item in files):
        raise ValueError('Empty module or an individual blob exceeds the publication limit')
    original, delivered = (ROOT / 'docs' / name for name in ('BOW_FIDELITE_R27.xlsx', 'BOW_FIDELITE_R28.xlsx'))
    with ZipFile(original) as old, ZipFile(delivered) as new:
        parts = [name for name in old.namelist() if name.startswith('xl/worksheets/')]
        if any(old.read(name) != new.read(name) for name in parts):
            raise ValueError('Historical worksheet XML or relationships changed')
        sheets = lambda names: sum(name.startswith('xl/worksheets/sheet') and name.endswith('.xml') for name in names)
        if (sheets(old.namelist()), sheets(new.namelist())) != (35, 42):
            raise ValueError('Expected35 historical and7 additional worksheets')
    return {'schema': 're.bow.additive-delivery-r28/1', 'baseline_commit': BASELINE,
            'historical_files_changed': sorted(historical), 'protected_trees': protected,
            'historical_worksheet_parts_preserved': len(parts), 'historical_sheets_preserved': 35,
            'new_sheets': 7, 'module_file_count': len(files),
            'module_bytes': sum(item['bytes'] for item in files), 'files': files,
            'baseline_workbook': record(original), 'workbook': record(delivered),
            'canonical_fidelity_certified': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--staged', action='store_true')
    args = parser.parse_args()
    result = inspect()
    if args.staged:
        for item in result['files']:
            if git('rev-parse', ':' + item['path']).decode().strip() != item['git_blob_sha1']:
                raise ValueError('Git index changed source bytes: ' + item['path'])
    path = ROOT / 'docs/R28_SOURCE_ADDITIONS.json'
    payload = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if path.read_bytes() != payload:
            raise ValueError('R28 delivery ledger differs from current files')
    else:
        path.write_bytes(payload)
    print(json.dumps({'files': result['module_file_count'], 'bytes': result['module_bytes'],
                      'historical_sheets_preserved': 35, 'new_sheets': 7, 'index_bytes_verified': args.staged}))


if __name__ == '__main__':
    main()
