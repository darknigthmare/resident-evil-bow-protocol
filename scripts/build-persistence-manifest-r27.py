#!/usr/bin/env python3
"""Describe the R27 restored-replay bridge and its unchanged dependencies."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'modules/fidelity-r27/persistence/manifest.json'


def record(name):
    raw = (ROOT / name).read_bytes()
    return {'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def build():
    dependencies = ['src/save-center-r19.js', 'src/replay-vault-r13.js', 'src/catalog-replay-contract.js',
                    'modules/fidelity-r23/persistence/inspector.js', 'modules/fidelity-r24/persistence/engines.json',
                    'modules/fidelity-r24/persistence/sandbox.js', 'modules/fidelity-r25/persistence/bundle.js',
                    'modules/fidelity-r26/persistence/restore.js', 'modules/fidelity-r26/persistence/style.css']
    implementation = ['modules/fidelity-r27/persistence/' + name for name in ['index.html', 'style.css', 'bridge.js', 'page.js']]
    return {'schema': 're.bow.restored-replay-catalog/1', 'release': 'R27', 'title': 'Replays de la restauration isolée',
            'href': 'persistence/index.html', 'bridgeSchema': 're.bow.restored-replay-bridge/1',
            'source': {'database': 're.bow.restore-rehearsal.r26', 'readOnly': True,
                       'gameLocalStorageRead': False, 'gameLocalStorageWritten': False,
                       'originalR19TransportClaimed': False, 'rawNestedArchivePreserved': True,
                       'sourceRevisionAndValuesCheckedBeforeAndAfter': True, 'cloudBackend': False},
            'engineRoutes': ['main-current', 'main-pre-r13'],
            'individualExperimentalR7': {'inR19Archive': False, 'reader': '../fidelity-r25/persistence/index.html'},
            'bounds': {'sourceTransportBytes': 33554432, 'batchRecords': 30, 'renderedRows': 100, 'activeDownloadBlobs': 1},
            'features': ['explicit isolated revision read', 'exact nested archive extraction', 'exact replay source slices',
                         'private record selection', 'two original-engine passes', 'before/after source invalidation',
                         'unknown-contract and duplicate-ID refusal', 'bounded pagination', 'cancel and page-departure cleanup'],
            'originalDependencies': [record(path) for path in dependencies],
            'implementation': [record(path) for path in implementation],
            'canonicalFidelityCertified': False, 'gameRestorationCertified': False,
            'physicalCrashDurabilityCertified': False, 'newEngineCopies': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = build()
    raw = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    if args.check:
        if TARGET.read_bytes() != raw:
            raise ValueError('The R27 persistence manifest differs from the implementation or its exact dependencies')
    else:
        TARGET.write_bytes(raw)
    print(json.dumps({'checked': args.check, 'engine_routes': result['engineRoutes'], 'new_engine_copies': 0,
                      'game_storage_written': False, 'source_read_only': True}))


if __name__ == '__main__':
    main()
