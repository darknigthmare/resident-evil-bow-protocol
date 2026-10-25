#!/usr/bin/env python3
"""Record the actual isolated restoration implementation and original contracts."""
import argparse
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'modules/fidelity-r26/persistence/manifest.json'

def record(path):
    data = (ROOT / path).read_bytes()
    return {'path': path, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def build():
    files = ['modules/fidelity-r26/persistence/' + name for name in ('index.html', 'style.css', 'page.js', 'restore.js')]
    return {
        'schema': 're.bow.persistence-rehearsal-catalog/1', 'release': 'R26',
        'title': 'Répétition atomique de restauration dans un atelier isolé',
        'href': 'persistence/index.html',
        'storage': {'api': 'IndexedDB', 'database': 're.bow.restore-rehearsal.r26', 'version': 1, 'stores': ['values', 'meta'], 'gameLocalStorageWritten': False, 'cloudBackend': False, 'userActionRequired': True},
        'features': ['R19 baseline import', 'selected-group preview', 'exact raw-key copy', 'atomic values-and-journal commit', 'durable reload', 'explicit exact rollback', 'stale-state refusal', 'R19 export', 'explicit isolated clear'],
        'journalStates': ['committed', 'rolled-back'],
        'originalDependencies': [record(path) for path in ['src/save-center-r19.js', 'modules/fidelity-r23/persistence/inspector.js']],
        'implementation': [record(path) for path in files],
        'validation': {'browserScript': 'tests/browser-persistence-r26.mjs', 'report': 'docs/R26_PERSISTENCE_BROWSER_TESTS.json', 'partialWriteAbortTested': True, 'durableReloadTested': True, 'physicalCrashCertified': False, 'gameRestoreCertified': False, 'nativeGameFidelityCertified': False},
        'limits': {'fileBytes': 33554432, 'rawValueUtf16Units': 8388608, 'totalRawUtf16Units': 12582912, 'strictJsonDepth': 96, 'journalHistory': 1},
        'notes': ['Original R19 validation and raw strings are retained; exported R19 container metadata is newly authored.', 'R19 FNV transport checksum is not authentication.', 'Atomicity is observed in virtualized Chromium IndexedDB; physical disk durability and cloud restoration are unverified.', 'R25 replay reader and its three exact historical engine routes remain available via a link; no engine is copied or changed.']
    }

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    expected = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
    if args.check:
        if not OUT.is_file() or OUT.read_text() != expected:
            raise SystemExit('R26 persistence manifest differs from implementation/dependency bytes')
        print('PASS R26 persistence manifest and original dependency hashes')
    else:
        OUT.parent.mkdir(parents=True, exist_ok=True); OUT.write_text(expected); print(OUT.relative_to(ROOT))
if __name__ == '__main__':
    main()
