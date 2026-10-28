#!/usr/bin/env python3
"""Verify R31 remains additive to the published R30 release."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
BASELINE = '12cdd7e38b5785cb9fbbb3fe3dff8d0f7f41fa24'
HTML = {'modules/versus.html', 'catalog-duel.html', 'codex.html', 'saves.html'}
WORKFLOWS = {'.github/workflows/source-fidelity-r30.yml', '.github/workflows/interface-r20-browser.yml'}


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def record(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest(),
            'git_blob_sha1': hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()}


def inspect():
    changed = [name for name in git('diff', '--name-only', '-z', BASELINE, '--').decode().split('\0') if name]
    historical = {name for name in changed if git('ls-tree', BASELINE, '--', name).strip()}
    if historical - HTML - WORKFLOWS:
        raise ValueError('Historical source changed: ' + ', '.join(sorted(historical - HTML - WORKFLOWS)))
    additions = [name for name in git('ls-files', '--others', '--exclude-standard', '-z').decode().split('\0') if name]
    additions += [name for name in git('diff', '--name-only', '-z', '--diff-filter=A', BASELINE, '--').decode().split('\0') if name]
    for name in additions:
        if name.startswith(('src/', 'data/', 'assets/')) or (name.startswith('modules/') and not name.startswith('modules/fidelity-r31/')):
            raise ValueError('New files entered a frozen game/source tree: ' + name)
    for name in ('modules/versus.html', 'catalog-duel.html'):
        before, after = git('show', BASELINE + ':' + name), (ROOT / name).read_bytes()
        prefix = 'fidelity-r31/' if name.startswith('modules/') else 'modules/fidelity-r31/'
        restored = after
        for route in ('performance/image-budget.js', 'access/match-summary.js', 'performance/monitor.js'):
            mount = ('<script src="' + prefix + route + '"></script>').encode()
            if restored.count(mount) != 1:
                raise ValueError('Expected exactly one current R31 mount: ' + name + ':' + route)
            restored = restored.replace(mount, b'')
        restored = restored.replace(b'fidelity-r31/combat/generated-runtime.js', b'fidelity-r29/combat/sprite-runtime.js')
        for route in (b'evolutions/selection.js', b'combat/native-runtime.js', b'combat/native-adapter.js', b'selection/avatars.js'):
            restored = restored.replace(b'fidelity-r31/' + route, b'fidelity-r30/' + route)
        if restored != before:
            raise ValueError('Combat HTML contains more than reviewed presentation mounts: ' + name)
    for name, route in (('codex.html', 'dossier-link.js'), ('saves.html', 'persistence/link.js')):
        before, after = git('show', BASELINE + ':' + name), (ROOT / name).read_bytes()
        mount = ('<script src="modules/fidelity-r31/' + route + '"></script>').encode()
        if after.count(mount) != 1 or after.replace(mount, b'') != before:
            raise ValueError('Expected exactly one additive R31 link: ' + name)
    recovery_path = ROOT / 'docs/R31_CI_RECOVERY.json'
    recovery = json.loads(recovery_path.read_text())
    if recovery.get('passed') != 2 or recovery.get('failed') != 0:
        raise ValueError('Historical workflow repairs require their actual reproduced proofs')
    reviewed = {row['path']: row['sha256'] for row in recovery['sourceFiles']}
    for name in WORKFLOWS:
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != reviewed.get(name):
            raise ValueError('Historical workflow differs from the executed recovery: ' + name)
    files = [record(path) for path in sorted((ROOT / 'modules/fidelity-r31').rglob('*')) if path.is_file()]
    if not files or any(row['bytes'] >= 100 * 1024 * 1024 for row in files):
        raise ValueError('R31 module is empty or contains an oversized GitHub blob')
    old_path, new_path = (ROOT / 'docs' / name for name in ('BOW_FIDELITE_R30.xlsx', 'BOW_FIDELITE_R31.xlsx'))
    with ZipFile(old_path) as old, ZipFile(new_path) as new:
        parts = [name for name in old.namelist() if name.startswith('xl/worksheets/')]
        if any(old.read(name) != new.read(name) for name in parts):
            raise ValueError('Historical worksheet XML or relationships changed')
        count = lambda archive: sum(name.startswith('xl/worksheets/sheet') and name.endswith('.xml') for name in archive.namelist())
        old_count, new_count = count(old), count(new)
        if old_count != 56 or new_count != 63:
            raise ValueError('Expected56 preserved R30 sheets and7 new R31 sheets')
    return {'schema': 're.bow.additive-delivery-r31/1', 'baseline_commit': BASELINE,
            'historical_files_changed': sorted(historical), 'all_other_historical_files_unchanged': True,
            'historical_worksheet_parts_preserved': len(parts), 'historical_sheets_preserved': old_count,
            'new_sheets': new_count - old_count, 'module_file_count': len(files),
            'module_bytes': sum(row['bytes'] for row in files), 'files': files,
            'baseline_workbook': record(old_path), 'workbook': record(new_path), 'canonical_fidelity_certified': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true'); parser.add_argument('--staged', action='store_true')
    args = parser.parse_args(); result = inspect()
    if args.staged:
        index = {}
        for line in git('ls-files', '--stage', '-z', '--', 'modules/fidelity-r31').decode().split('\0'):
            if not line:
                continue
            metadata, name = line.split('\t', 1); mode, digest, stage = metadata.split()
            if stage != '0':
                raise ValueError('Unmerged module file: ' + name)
            index[name] = digest
        for row in result['files']:
            if index.get(row['path']) != row['git_blob_sha1']:
                raise ValueError('Git index changed source bytes: ' + row['path'])
    output = ROOT / 'docs/R31_SOURCE_ADDITIONS.json'
    raw = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if output.read_bytes() != raw:
            raise ValueError('R31 conservation ledger is stale')
    else:
        output.write_bytes(raw)
    print(json.dumps({'files': result['module_file_count'], 'bytes': result['module_bytes'],
                      'historical_sheets_preserved': result['historical_sheets_preserved'],
                      'new_sheets': result['new_sheets'], 'index_bytes_verified': args.staged}))


if __name__ == '__main__':
    main()
