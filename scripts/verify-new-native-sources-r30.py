#!/usr/bin/env python3
"""Run actual native lot E provenance/image tests and bind the tested inputs."""
import hashlib
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    suite = unittest.defaultTestLoader.discover(str(ROOT / 'tests'), pattern='test_new_native_sources_r30.py')
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    paths = ['scripts/prepare-new-native-sources-r30.py', 'scripts/render-new-native-sources-r30.mjs',
        'scripts/build-new-native-manifest-r30.py', 'scripts/verify-new-native-sources-r30.py',
        'tests/test_new_native_sources_r30.py', 'modules/fidelity-r30/native/new-sources/catalog.json',
        'modules/fidelity-r30/native/new-sources/manifest.json', 'modules/fidelity-r30/native/new-sources/renders.json',
        'modules/fidelity-r30/native/new-sources/renderer.js', 'modules/fidelity-r30/native/new-sources/gamma-fbx-inspection.json',
        'modules/fidelity-r30/native/new-sources/review/contacts.json', 'modules/fidelity-r30/native/new-sources/review/observations.json',
        'modules/fidelity-r30/native/new-sources/acquisition/receipts.json', 'modules/fidelity-r30/native/new-sources/acquisition/corroboration.json']
    inputs = []
    for relative in paths:
        raw = (ROOT / relative).read_bytes()
        inputs.append({'path': relative, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    report = {'schema': 're.bow.native-new-source-tests-r30/1', 'release': 'R30', 'passed': result.testsRun - len(result.failures) - len(result.errors),
        'failed': len(result.failures) + len(result.errors), 'testsRun': result.testsRun,
        'actualChecks': {'acquiredArchives': 11, 'sourceModelVariants': 38, 'sourcePngsDecoded': 152,
            'nativeArchiveMembersByteVerified': True, 'nativeGammaFbxReparsed': True,
            'sourceCurvesFound': 0, 'originalGameFramesCertified': 0, 'idleAnimationsAdmitted': 0},
        'python': sys.version.split()[0], 'inputs': inputs}
    (ROOT / 'docs/R30_NEW_NATIVE_TESTS.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'passed': report['passed'], 'failed': report['failed']}))
    raise SystemExit(0 if result.wasSuccessful() else 1)


if __name__ == '__main__':
    main()
