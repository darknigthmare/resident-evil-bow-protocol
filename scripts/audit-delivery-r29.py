#!/usr/bin/env python3
"""Verify the additive R29 delivery, retained source bytes and worksheet history."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
BASELINE = '9bcb3535189ffa7b21f08f733be2f1afeb73b984'
ALLOWED = {'modules/versus.html', 'catalog-duel.html', 'codex.html'} | {
    '.github/workflows/source-fidelity-r' + str(release) + '.yml' for release in range(25, 29)}


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def record(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest(),
            'git_blob_sha1': hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()}


def inspect():
    changed = git('diff', '--name-only', BASELINE, '--').decode().splitlines()
    historical = {name for name in changed if git('ls-tree', BASELINE, '--', name).strip()}
    if historical - ALLOWED:
        raise ValueError('Unreviewed historical changes: ' + ', '.join(sorted(historical - ALLOWED)))
    for name in sorted(historical & {'modules/versus.html', 'catalog-duel.html', 'codex.html'}):
        before, after = git('show', BASELINE + ':' + name), (ROOT / name).read_bytes()
        if name == 'codex.html':
            mount = b'<script src="modules/fidelity-r29/dossier-link.js"></script>'
            if after.count(mount) != 1 or after.replace(mount, b'') != before:
                raise ValueError('Codex must retain exactly one additive R29 Dossier mount')
        else:
            restored = after
            for route in (b'evolutions/selection.js', b'combat/sprite-runtime.js'):
                new, old = b'fidelity-r29/' + route, b'fidelity-r28/' + route
                if restored.count(new) != 1:
                    raise ValueError('Expected exactly one current R29 mount: ' + name)
                restored = restored.replace(new, old)
            if restored != before:
                raise ValueError('Unreviewed combat HTML changes: ' + name)
    protected = ['src', 'data', 'assets', 'docs/planning'] + [
        'modules/' + path.name for path in sorted((ROOT / 'modules').iterdir())
        if path.is_dir() and path.name != 'fidelity-r29']
    delta = git('diff', '--name-only', BASELINE, '--', *protected).decode().splitlines()
    extra = git('ls-files', '--others', '--exclude-standard', '--', *protected).decode().splitlines()
    if delta or extra:
        raise ValueError('Protected historical trees changed: ' + ', '.join(delta + extra))
    files = [record(path) for path in sorted((ROOT / 'modules/fidelity-r29').rglob('*')) if path.is_file()]
    if not files or any(item['bytes'] >= 100 * 1024 * 1024 for item in files):
        raise ValueError('Empty source module or a blob exceeds the publication limit')
    original, output = (ROOT / 'docs' / name for name in ('BOW_FIDELITE_R28.xlsx', 'BOW_FIDELITE_R29.xlsx'))
    with ZipFile(original) as old, ZipFile(output) as new:
        parts = [name for name in old.namelist() if name.startswith('xl/worksheets/')]
        if any(old.read(name) != new.read(name) for name in parts):
            raise ValueError('Historical worksheet XML or relationships changed')
        count = lambda archive: sum(name.startswith('xl/worksheets/sheet') and name.endswith('.xml') for name in archive.namelist())
        old_count, new_count = count(old), count(new)
        if old_count != 42 or new_count <= old_count:
            raise ValueError('Expected42 preserved historical sheets and additional R29 sheets')
    return {'schema': 're.bow.additive-delivery-r29/1', 'baseline_commit': BASELINE,
            'historical_files_changed': sorted(historical), 'protected_trees': protected,
            'historical_worksheet_parts_preserved': len(parts), 'historical_sheets_preserved': old_count,
            'new_sheets': new_count - old_count, 'module_file_count': len(files),
            'module_bytes': sum(item['bytes'] for item in files), 'files': files,
            'baseline_workbook': record(original), 'workbook': record(output),
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
    output = ROOT / 'docs/R29_SOURCE_ADDITIONS.json'
    payload = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if output.read_bytes() != payload:
            raise ValueError('R29 ledger differs from the actual delivery')
    else:
        output.write_bytes(payload)
    print(json.dumps({'files': result['module_file_count'], 'bytes': result['module_bytes'],
                      'historical_sheets_preserved': result['historical_sheets_preserved'],
                      'new_sheets': result['new_sheets'], 'index_bytes_verified': args.staged}))


if __name__ == '__main__':
    main()
