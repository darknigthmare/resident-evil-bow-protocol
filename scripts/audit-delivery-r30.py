#!/usr/bin/env python3
"""Verify the additive R30 release and the unchanged R29 source history."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
BASELINE = '747a88f2da61b46c6e825ef79a9562e1d42578c8'
ALLOWED = {'modules/versus.html', 'catalog-duel.html', 'codex.html'} | {
    f'.github/workflows/source-fidelity-r{release}.yml' for release in (25, 26, 29)}
MOUNTS = ('combat/native-runtime.js', 'combat/native-adapter.js', 'selection/avatars.js')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def record(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest(),
            'git_blob_sha1': hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()}


def inspect():
    baseline = git('rev-parse', BASELINE + '^{commit}').decode().strip()
    changed = git('diff', '--name-only', baseline, '--').decode().splitlines()
    historical = set()
    for name in changed:
        if git('ls-tree', baseline, '--', name).strip():
            historical.add(name)
    if historical - ALLOWED:
        raise ValueError('Unexpected historical changes: ' + ', '.join(sorted(historical - ALLOWED)))
    additions = git('ls-files', '--others', '--exclude-standard').decode().splitlines()
    additions += git('diff', '--name-only', '--diff-filter=A', baseline, '--').decode().splitlines()
    for name in additions:
        if name.startswith(('src/', 'data/', 'assets/')) or (
                name.startswith('modules/') and not name.startswith('modules/fidelity-r30/')):
            raise ValueError('New files cannot enter frozen game/source trees: ' + name)
    for release, commit, expected_count in (
            (25, '300dc0169d83382189cd6c8889cb4f7368f1e8a5', 1),
            (26, '826f7ed1811c48adc0609f97699eb32f629fc78a', 1),
            (29, '06910922109445ef387414874d09add2839e70a8', 3)):
        name = f'.github/workflows/source-fidelity-r{release}.yml'
        before, after = git('show', baseline + ':' + name), (ROOT / name).read_bytes()
        added = ('          # Historical assertions retain their published source and link targets.\n'
                 '          ref: ' + commit + '\n').encode()
        if after.count(added) != expected_count or after.replace(added, b'') != before:
            raise ValueError('Historical CI may only gain its reviewed source snapshot: ' + name)
    for name in ('modules/versus.html', 'catalog-duel.html'):
        before, after = git('show', baseline + ':' + name), (ROOT / name).read_bytes()
        prefix = 'fidelity-r30/' if name.startswith('modules/') else 'modules/fidelity-r30/'
        mounts = ''.join('<script src="' + prefix + route + '"></script>' for route in MOUNTS).encode()
        if after.count(mounts) != 1:
            raise ValueError('Expected exactly one current sprite/avatar mount: ' + name)
        restored = after.replace(mounts, b'').replace(b'fidelity-r30/evolutions/selection.js', b'fidelity-r29/evolutions/selection.js')
        if restored != before:
            raise ValueError('Combat HTML has more than the reviewed mounts: ' + name)
    if 'codex.html' in historical:
        before, after = git('show', baseline + ':codex.html'), (ROOT / 'codex.html').read_bytes()
        mount = b'<script src="modules/fidelity-r30/dossier-link.js"></script>'
        if after.count(mount) != 1 or after.replace(mount, b'') != before:
            raise ValueError('Codex has more than one additive R30 mount')
    files = [record(path) for path in sorted((ROOT / 'modules/fidelity-r30').rglob('*')) if path.is_file()]
    if not files or any(item['bytes'] >= 100 * 1024 * 1024 for item in files):
        raise ValueError('The module is empty or has an oversized GitHub blob')
    original = ROOT / 'docs/BOW_FIDELITE_R29.xlsx'
    output = ROOT / 'docs/BOW_FIDELITE_R30.xlsx'
    with ZipFile(original) as old, ZipFile(output) as new:
        parts = [name for name in old.namelist() if name.startswith('xl/worksheets/')]
        for name in parts:
            if old.read(name) != new.read(name):
                raise ValueError('Historical worksheet changed: ' + name)
        count = lambda archive: sum(name.startswith('xl/worksheets/sheet') and name.endswith('.xml') for name in archive.namelist())
        old_count, new_count = count(old), count(new)
        if old_count != 49 or new_count <= old_count:
            raise ValueError('Expected49 preserved historical sheets and new R30 sheets')
    return {'schema': 're.bow.additive-delivery-r30/1', 'baseline_commit': baseline,
            'historical_files_changed': sorted(historical),
            'all_other_historical_files_unchanged': True,
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
        entries = {}
        for line in git('ls-files', '--stage', '-z', '--', 'modules/fidelity-r30').decode().split('\0'):
            if not line:
                continue
            metadata, name = line.split('\t', 1)
            mode, digest, stage = metadata.split()
            if stage != '0':
                raise ValueError('Unmerged module file: ' + name)
            entries[name] = digest
        for item in result['files']:
            if entries.get(item['path']) != item['git_blob_sha1']:
                raise ValueError('Git index differs from source bytes: ' + item['path'])
    path = ROOT / 'docs/R30_SOURCE_ADDITIONS.json'
    payload = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if path.read_bytes() != payload:
            raise ValueError('R30 conservation ledger is stale')
    else:
        path.write_bytes(payload)
    print(json.dumps({'files': result['module_file_count'], 'bytes': result['module_bytes'],
                      'historical_sheets_preserved': result['historical_sheets_preserved'],
                      'new_sheets': result['new_sheets'], 'index_bytes_verified': args.staged}))


if __name__ == '__main__':
    main()
