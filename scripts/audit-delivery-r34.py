#!/usr/bin/env python3
"""Preserve the published R33 tree and verify staged R34 module bytes."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = '6c2d0d91f4dd79eff1190cd50a352feb2a05dfe5'
ALLOWED = {'package.json', '.github/workflows/source-fidelity-r25.yml', '.github/workflows/source-fidelity-r26.yml',
           'modules/versus.html', 'catalog-duel.html', '.github/workflows/source-fidelity-r31.yml',
           '.github/workflows/gamedev-r32.yml', '.github/workflows/source-fidelity-r33.yml',
           '.github/workflows/access-r18-integration.yml',
           '.github/workflows/audit-r9-browser.yml',
           '.github/workflows/baker-audio-r15-browser.yml',
           '.github/workflows/baker-audio-r15-integration.yml',
           '.github/workflows/baker-r14-browser.yml',
           '.github/workflows/baker-r14-integration.yml',
           '.github/workflows/baker-r14-workbook.yml',
           '.github/workflows/catalog-replay-r7.yml',
           '.github/workflows/combat-text-r17-browser.yml',
           '.github/workflows/combat-text-r17-integration.yml',
           '.github/workflows/finalize-audit-r9.yml',
           '.github/workflows/flight-r12-browser.yml',
           '.github/workflows/flight-r12-integration.yml',
           '.github/workflows/lucas-r11-browser.yml',
           '.github/workflows/lucas-r11-integration.yml',
           '.github/workflows/package-direction-r4.yml',
           '.github/workflows/r10-browser.yml',
           '.github/workflows/replay-r13-browser.yml',
           '.github/workflows/replay-r13-integration.yml',
           '.github/workflows/saves-r19-integration.yml',
           '.github/workflows/trial-audio-r16-integration.yml',
           'tests/browser-fidelity-dashboard-r24.mjs'}
LEDGER = ROOT / 'docs/R34_SOURCE_ADDITIONS.json'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def module_files():
    return sorted(path for path in (ROOT / 'modules/fidelity-r34').rglob('*') if path.is_file())


def inspect():
    changes = git('diff', '--name-status', '--no-renames', '-z', BASE, '--').split(b'\0')
    changes = [value.decode('utf-8') for value in changes if value]
    modified = []
    for status, name in zip(changes[::2], changes[1::2]):
        if status == 'A':
            continue
        assert status == 'M' and name in ALLOWED, 'Historical file outside the R34 boundary changed: ' + name
        baseline = git('show', BASE + ':' + name)
        modified.append({'path': name, 'baselineSha256': sha(baseline),
                         'sha256': sha((ROOT / name).read_bytes())})
    assert {item['path'] for item in modified} == ALLOWED, 'All reviewed R34 boundary changes must be explicit.'
    files = []
    for path in module_files():
        assert not path.is_symlink(), 'Module assets must be ordinary checkout files.'
        raw = path.read_bytes()
        assert len(raw) < 100 * 1024 * 1024, 'An R34 file exceeds the GitHub blob limit.'
        files.append({'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': sha(raw)})
    return {'schema': 're.bow.source-additions-r34/1', 'baselineCommit': BASE,
            'modifiedHistoricalFiles': sorted(modified, key=lambda item: item['path']),
            'moduleFileCount': len(files), 'moduleBytes': sum(item['bytes'] for item in files), 'moduleFiles': files,
            'historicalWorkbook': {'path': 'docs/BOW_FIDELITE_R33.xlsx', 'sha256': sha((ROOT / 'docs/BOW_FIDELITE_R33.xlsx').read_bytes())},
            'scope': 'Published R33 files frozen except the exact reviewed presentation, pipeline, legacy browser preloads and primary-link discovery correction. All R34 module files hash-bound; guardR34 separately checks each allowed transformation and all addition paths.'}


def staged_check(evidence):
    index = {}
    for value in git('ls-files', '--stage', '-z').split(b'\0'):
        if not value:
            continue
        metadata, name = value.split(b'\t', 1)
        mode, oid, stage = metadata.split()
        assert stage == b'0', 'Unmerged index entry.'
        index[name.decode('utf-8')] = oid.decode()
    for item in evidence['moduleFiles']:
        raw = (ROOT / item['path']).read_bytes()
        oid = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        assert index.get(item['path']) == oid, 'Staged R34 bytes differ: ' + item['path']
    return {'schema': 're.bow.staged-conservation-r34/1', 'baselineCommit': BASE, 'indexBytesVerified': True,
            'files': evidence['moduleFileCount'], 'bytes': evidence['moduleBytes'],
            'historicalFilesModified': len(evidence['modifiedHistoricalFiles']), 'historicalSheetsPreserved': 70,
            'scope': 'Exact Git blob bytes of every R34 module file; workbook preservation is independently established by the export/reproduction proofs.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--staged', action='store_true')
    args = parser.parse_args()
    evidence = inspect()
    raw = (json.dumps(evidence, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        assert LEDGER.read_bytes() == raw, 'The R34 source ledger is stale.'
    else:
        LEDGER.write_bytes(raw)
    if args.staged:
        report = staged_check(evidence)
        (ROOT / 'docs/R34_STAGED_CONSERVATION.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'files': evidence['moduleFileCount'], 'bytes': evidence['moduleBytes'], 'historicalChanges': len(evidence['modifiedHistoricalFiles']), 'staged': args.staged}))


if __name__ == '__main__':
    main()
