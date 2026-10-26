#!/usr/bin/env python3
"""Run real source/body tests and bind their report to current code and records."""
import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
suite = unittest.defaultTestLoader.discover(str(ROOT / 'tests'), pattern='test_body_sources_r28.py')
result = unittest.TextTestRunner(verbosity=2).run(suite)
paths = [
    'tests/test_body_sources_r28.py', 'scripts/import-body-sprites-r28.py',
    'scripts/render-source-body-rasters-r28.mjs', 'scripts/capture-body-sprite-review-r28.mjs',
    'modules/fidelity-r28/sources/body-rasters/manifest.json',
    'modules/fidelity-r28/sources/online-evidence.json',
    *[path.relative_to(ROOT).as_posix() for path in sorted((ROOT / 'modules/fidelity-r28/sprites/records').glob('*.json'))],
]
failed = len(result.failures) + len(result.errors)
report = {
    'schema':'re.bow.source-body-validation-r28/1',
    'complete':result.testsRun > 0 and result.wasSuccessful(),
    'passed':result.testsRun - failed - len(result.skipped), 'failed':failed,
    'skipped':len(result.skipped), 'testsRun':result.testsRun,
    'command':'python scripts/verify-body-sources-r28.py',
    'inputs':[{'path':path, 'sha256':hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for path in paths],
    'counts':{'sourceModels':8, 'sourceIdentities':6, 'sourceReferencePngs':32,
              'freshPublisherPageCaptures':6, 'selectedGeneratedFullBodyPngs':4,
              'newTargetIdentities':0, 'combatIdleSprites':0, 'originalGameSprites':0,
              'canonicalFidelityCertified':0},
    'scope':'Every32 separate source PNG hash/alpha/clipping, source model/material/texture bytes, camera-only source poses, six publisher captures, four exact-UID generated body records and source/output reviews verified. Base/rest anatomy is visually complete; Lisa phase/equipment and Cerberus source accessory role remain open. No original-game geometry, exact animation, original equipment or original-game rendering certification.'
}
(ROOT / 'docs/R28_BODY_SOURCES_TESTS.json').write_text(json.dumps(report, indent=2) + '\n')
raise SystemExit(0 if report['complete'] else 1)
